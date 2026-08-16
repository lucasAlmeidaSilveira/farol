import { nthBusinessDay } from '@/domain/business-days'
import { add, type Cents, ZERO } from '@/domain/money'
import {
  addMonths,
  calendarPeriodOf,
  type Cycle,
  daysBetween,
  lastDayOfMonth,
  type LocalDate,
  localDate,
  type Period,
  yearMonth,
} from '@/domain/period'
import type { CommitmentId, DueRule } from '@/domain/types'

import type { CommitmentLine } from './types'

/**
 * Vencimentos.
 *
 * Um `dueDay` é um número de 1 a 31 — não uma data. Transformá-lo em data
 * dentro de um ciclo tem duas sutilezas que erram fácil:
 *
 * 1. MÊS CURTO. Vencimento dia 31 em fevereiro não existe; a conta vence no
 *    último dia do mês.
 *
 * 2. CICLO QUE NÃO COMEÇA DIA 1. Se o ciclo vai de 05/08 a 04/09, uma conta que
 *    vence dia 3 NÃO vence em 03/08 — essa data é anterior ao ciclo. Ela vence
 *    em 03/09, ainda dentro da mesma competência. Resolver isso pelo mês do
 *    calendário produziria uma conta "atrasada" que na verdade nem chegou.
 */

export type DueStatus = 'settled' | 'overdue' | 'today' | 'soon' | 'upcoming'

/** Quantos dias antes do vencimento a conta passa a ser destacada. */
export const SOON_THRESHOLD_DAYS = 3

export type DueItem = {
  readonly commitmentId: CommitmentId
  readonly name: string
  readonly amountCents: Cents
  readonly outstandingCents: Cents
  readonly dueDate: LocalDate
  /** Negativo quando já passou. Zero é hoje. */
  readonly daysUntil: number
  /** A regra que gerou a data, para a UI explicar "5º dia útil". */
  readonly rule: DueRule
  readonly status: DueStatus
}

const pad = (value: number): string => String(value).padStart(2, '0')

/** O dia D dentro de um mês, limitado ao último dia real daquele mês. */
function dayWithinMonth(period: Period, day: number): LocalDate {
  const { year, month } = yearMonth(period)
  return localDate(
    `${period}-${pad(Math.min(day, lastDayOfMonth(year, month)))}`,
  )
}

/**
 * A data em que `dueDay` acontece DENTRO deste ciclo.
 *
 *   ciclo 01/08..31/08, dia 10  ->  2026-08-10
 *   ciclo 05/08..04/09, dia 3   ->  2026-09-03  (03/08 é antes do ciclo)
 *   ciclo 01/02..28/02, dia 31  ->  2026-02-28  (clamp do mês curto)
 */
export function dueDateWithin(cycle: Cycle, dueDay: number): LocalDate {
  return resolveWithin(cycle, { type: 'dayOfMonth', day: dueDay })
}

/**
 * A data de uma regra de vencimento DENTRO deste ciclo.
 *
 * A mesma lógica de virada vale para as duas regras: se a ocorrência do mês
 * inicial for anterior ao ciclo, a válida é a do mês seguinte.
 */
export function resolveWithin(cycle: Cycle, rule: DueRule): LocalDate {
  const startMonth = calendarPeriodOf(cycle.start)
  const occurrence = (month: typeof startMonth) =>
    rule.type === 'dayOfMonth'
      ? dayWithinMonth(month, rule.day)
      : nthBusinessDay(month, rule.n)

  const first = occurrence(startMonth)
  if (first >= cycle.start) return first

  return occurrence(addMonths(startMonth, 1))
}

type ScheduleParams = {
  readonly commitments: readonly CommitmentLine[]
  readonly cycle: Cycle
  readonly today: LocalDate
}

/**
 * As contas com vencimento, ordenadas por data.
 *
 * A ordenação por data é o ponto da feature: uma lista de contas sem ordem não
 * é lembrete, é inventário. Atrasadas vêm primeiro porque são as únicas que
 * exigem ação hoje.
 */
export function dueSchedule({
  commitments,
  cycle,
  today,
}: ScheduleParams): DueItem[] {
  return commitments
    .filter((line) => line.dueRule !== null)
    .map((line) => {
      const dueDate = resolveWithin(cycle, line.dueRule as DueRule)
      const daysUntil = daysBetween(today, dueDate)

      return {
        commitmentId: line.commitmentId,
        name: line.name,
        amountCents: line.consideredCents,
        outstandingCents: line.outstandingCents,
        dueDate,
        daysUntil,
        rule: line.dueRule as DueRule,
        status: statusOf(line, daysUntil),
      }
    })
    .sort(
      (a, b) =>
        // Atrasadas primeiro, depois por data. O desempate por nome mantém a
        // ordem estável entre renderizações.
        rank(a.status) - rank(b.status) ||
        (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0) ||
        a.name.localeCompare(b.name),
    )
}

function statusOf(line: CommitmentLine, daysUntil: number): DueStatus {
  // Quitado é quitado, mesmo vencido: a pessoa já resolveu.
  if (line.outstandingCents === ZERO) return 'settled'
  if (daysUntil < 0) return 'overdue'
  if (daysUntil === 0) return 'today'
  if (daysUntil <= SOON_THRESHOLD_DAYS) return 'soon'
  return 'upcoming'
}

const RANK: Record<DueStatus, number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  upcoming: 3,
  settled: 4,
}

const rank = (status: DueStatus): number => RANK[status]

/** Quanto ainda falta pagar entre as contas com vencimento. */
export const outstandingTotal = (items: readonly DueItem[]): Cents =>
  add(...items.map((item) => item.outstandingCents))
