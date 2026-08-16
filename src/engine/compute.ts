import { add, atLeastZero, type Cents, subtract, ZERO } from '@/domain/money'
import { cycleFor } from '@/domain/period'
import type {
  Entry,
  ExpenseEntry,
  IncomeEntry,
  SettlementEntry,
} from '@/domain/types'

import { assessCommitments } from './commitments'
import { dueSchedule } from './due'
import { consolidateIncome } from './income'
import { calculatePace } from './pace'
import { materializeCommitments, materializeIncomeSources } from './recurrence'
import {
  type Alert,
  type CommitmentLine,
  ENGINE_VERSION,
  type EngineInput,
  type IncomeSummary,
  type MonthSummary,
  type MonthTotals,
} from './types'

/**
 * O orquestrador. Uma função pura `estado -> resumo`, sem saldo incremental:
 * entrou lançamento, recalcula o mês inteiro. São dezenas de documentos, custa
 * microssegundos, e elimina classes inteiras de bug de dessincronização.
 */
export function computeMonth(input: EngineInput): MonthSummary {
  const cycle = cycleFor(input.period, input.config.cycleStart)
  const status = input.plan?.status ?? 'open'

  // Mês fechado devolve o snapshot congelado. Corrigir um lançamento antigo
  // não pode reescrever o histórico por efeito colateral — reabrir é uma ação
  // explícita do usuário.
  if (status === 'closed' && input.plan?.close) {
    return input.plan.close.summary as MonthSummary
  }

  const incomeEntries = input.entries.filter(isIncome)
  const expenseEntries = input.entries.filter(isExpense)
  const settlementEntries = input.entries.filter(isSettlement)

  const referencedIds = new Set(
    incomeEntries
      .map((entry) => entry.sourceId)
      .filter((id): id is NonNullable<typeof id> => id !== null),
  )

  const sources = materializeIncomeSources(
    input.incomeSources,
    input.period,
    input.plan,
    referencedIds,
  )
  const commitments = materializeCommitments(
    input.commitments,
    input.period,
    input.plan,
  )

  const income = consolidateIncome({
    sources,
    entries: incomeEntries,
    policy: input.config.variableIncomePolicy,
  })

  const settledByCommitment = sumBy(
    settlementEntries,
    (entry) => entry.commitmentId,
  )

  const lines = assessCommitments({
    commitments,
    lines: income.lines,
    period: input.period,
    carriedByCommitment: input.carriedByCommitment,
    settledByCommitment,
  })

  const totals = calculateTotals(income, lines, expenseEntries)

  const pace = calculatePace({
    cycle,
    today: input.today,
    remainingToSpendCents: totals.remainingToSpendCents,
    availableToSpendCents: totals.availableToSpendCents,
    freeExpenseCents: totals.freeExpenseCents,
    status,
  })

  return {
    engineVersion: ENGINE_VERSION,
    period: input.period,
    cycle,
    status,
    income,
    commitments: lines,
    totals,
    pace,
    due: dueSchedule({ commitments: lines, cycle, today: input.today }),
    alerts: collectAlerts({ income, lines, totals, cycle, today: input.today }),
  }
}

// ------------------------------------------------------------------ totais

function calculateTotals(
  income: IncomeSummary,
  lines: readonly CommitmentLine[],
  expenses: readonly ExpenseEntry[],
): MonthTotals {
  const forecastCommitmentCents = add(
    ...lines.map((line) => line.forecastCents),
  )
  const consideredCommitmentCents = add(
    ...lines.map((line) => line.consideredCents),
  )

  // Pagar mais do que o apurado não some: o excedente é gasto livre.
  const freeExpenseCents = add(
    ...expenses.map((entry) => entry.amountCents),
    ...lines.map((line) => line.overpaidCents),
  )

  const forecastAvailableCents = subtract(
    income.forecastCents,
    forecastCommitmentCents,
  )

  // NÃO limitado em zero: se os compromissos passam da renda, o número precisa
  // aparecer negativo. Limitar esconderia exatamente a informação que o app
  // existe para dar.
  const availableToSpendCents = subtract(
    income.consideredCents,
    consideredCommitmentCents,
  )

  return {
    forecastIncomeCents: income.forecastCents,
    receivedIncomeCents: income.receivedCents,
    consideredIncomeCents: income.consideredCents,
    forecastCommitmentCents,
    consideredCommitmentCents,
    settledCommitmentCents: add(...lines.map((line) => line.settledCents)),
    outstandingCommitmentCents: add(
      ...lines.map((line) => line.outstandingCents),
    ),
    freeExpenseCents,
    forecastAvailableCents,
    availableToSpendCents,
    remainingToSpendCents: subtract(availableToSpendCents, freeExpenseCents),
    // As três dimensões usam a MESMA base: considerado − previsto, ou seja,
    // "como o mês está em relação ao que foi planejado".
    //
    // Usar `recebido − previsto` na renda seria inconsistente com o disponível
    // e, pior, mostraria −R$ 3.250 no dia 1 do mês — como se a pessoa tivesse
    // perdido o salário, quando ele apenas ainda não caiu. Quem quiser a outra
    // leitura tem `receivedIncomeCents` e `forecastIncomeCents` separados.
    variance: {
      incomeCents: subtract(income.consideredCents, income.forecastCents),
      commitmentCents: subtract(
        consideredCommitmentCents,
        forecastCommitmentCents,
      ),
      availableCents: subtract(availableToSpendCents, forecastAvailableCents),
    },
  }
}

// ----------------------------------------------------------------- alertas

type AlertParams = {
  readonly income: IncomeSummary
  readonly lines: readonly CommitmentLine[]
  readonly totals: MonthTotals
  readonly cycle: ReturnType<typeof cycleFor>
  readonly today: string
}

function collectAlerts({
  income,
  lines,
  totals,
  cycle,
  today,
}: AlertParams): Alert[] {
  const alerts: Alert[] = []

  if (income.lines.length === 0 || totals.consideredIncomeCents === ZERO) {
    alerts.push({ code: 'NO_INCOME' })
  }

  if (totals.availableToSpendCents < ZERO) {
    alerts.push({
      code: 'COMMITMENTS_EXCEED_INCOME',
      deficitCents: atLeastZero(
        subtract(ZERO, totals.availableToSpendCents),
      ) as Cents,
    })
  }

  // O caso de uso central da Comunhão de Bens: quitou com base só no salário,
  // e o freela do dia 20 fez o compromisso subir depois.
  for (const line of lines) {
    if (line.settledCents > ZERO && line.outstandingCents > ZERO) {
      alerts.push({
        code: 'COMMITMENT_OUTSTANDING',
        commitmentId: line.commitmentId,
        name: line.name,
        amountCents: line.outstandingCents,
      })
    }
  }

  // O ciclo acabou e uma renda prevista nunca foi confirmada: o mês não pode
  // fechar em cima de dinheiro que não entrou.
  if (today > cycle.end) {
    for (const line of income.lines) {
      if (
        line.sourceId !== null &&
        line.kind === 'fixed' &&
        line.forecastCents > ZERO &&
        line.receivedCents === ZERO
      ) {
        alerts.push({
          code: 'FORECAST_UNCONFIRMED',
          sourceId: line.sourceId,
          name: line.name,
        })
      }
    }
  }

  return alerts
}

// ----------------------------------------------------------------- helpers

const isIncome = (entry: Entry): entry is IncomeEntry => entry.kind === 'income'
const isExpense = (entry: Entry): entry is ExpenseEntry =>
  entry.kind === 'expense'
const isSettlement = (entry: Entry): entry is SettlementEntry =>
  entry.kind === 'settlement'

function sumBy<T extends { amountCents: Cents }>(
  items: readonly T[],
  keyOf: (item: T) => string,
): Record<string, Cents> {
  const totals: Record<string, Cents> = {}
  for (const item of items) {
    const key = keyOf(item)
    totals[key] = add(totals[key] ?? ZERO, item.amountCents)
  }
  return totals
}
