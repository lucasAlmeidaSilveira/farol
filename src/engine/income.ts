import { add, type Cents, maxOf, ZERO } from '@/domain/money'
import type { IncomeEntry, VariableIncomePolicy } from '@/domain/types'

import type { MaterializedSource } from './recurrence'
import type { IncomeLine, IncomeSummary } from './types'

/**
 * A consolidação de renda é onde nasce o conceito de "considerado" — o número
 * que a home mostra.
 *
 * Previsto e realizado são relatórios. Sem um terceiro conceito, o app ou é
 * inútil no dia 1 do mês (realizado = 0) ou mentiroso no dia 30 (previsto
 * ignora o que aconteceu). É o "considerado" que faz o app funcionar com zero
 * lançamentos e ainda assim contar a verdade quando o mês anda.
 */

type ConsolidateParams = {
  readonly sources: readonly MaterializedSource[]
  readonly entries: readonly IncomeEntry[]
  readonly policy: VariableIncomePolicy
}

export function consolidateIncome({
  sources,
  entries,
  policy,
}: ConsolidateParams): IncomeSummary {
  const lines: IncomeLine[] = sources.map(({ source, forecastApplies }) => {
    const own = entries.filter((entry) => entry.sourceId === source.id)

    const receivedCents = add(...own.map((entry) => entry.amountCents))
    const forecastClosed = own.some((entry) => entry.closesForecast)
    const forecastCents = forecastApplies ? source.forecastCents : ZERO

    return {
      sourceId: source.id,
      name: source.name,
      kind: source.kind,
      confidence: source.confidence,
      forecastCents,
      receivedCents,
      forecastClosed,
      consideredCents: considered({
        kind: source.kind,
        policy,
        forecastClosed,
        forecastCents,
        receivedCents,
      }),
    }
  })

  const looseEntries = entries.filter((entry) => entry.sourceId === null)
  if (looseEntries.length > 0) {
    // Dinheiro que entrou sem fonte é, por definição, variável.
    const receivedCents = add(...looseEntries.map((entry) => entry.amountCents))
    lines.push({
      sourceId: null,
      name: 'Outras entradas',
      kind: 'variable',
      confidence: 'exact',
      forecastCents: ZERO,
      receivedCents,
      consideredCents: receivedCents,
      forecastClosed: true,
    })
  }

  return {
    lines,
    forecastCents: add(...lines.map((line) => line.forecastCents)),
    receivedCents: add(...lines.map((line) => line.receivedCents)),
    consideredCents: add(...lines.map((line) => line.consideredCents)),
  }
}

type ConsideredParams = {
  readonly kind: 'fixed' | 'variable'
  readonly policy: VariableIncomePolicy
  readonly forecastClosed: boolean
  readonly forecastCents: Cents
  readonly receivedCents: Cents
}

function considered({
  kind,
  policy,
  forecastClosed,
  forecastCents,
  receivedCents,
}: ConsideredParams): Cents {
  // Expectativa de freela não vira dinheiro para gastar. Para quem não sabe
  // quanto ganha, otimismo aqui é o começo de um mês estourado.
  if (kind === 'variable' && policy === 'confirmedOnly') return receivedCents

  // "O salário veio menor este mês": o recebido substitui a previsão.
  if (forecastClosed) return receivedCents

  // Recebimento parcial (adiantamento) não derruba a previsão do mês.
  return maxOf(forecastCents, receivedCents)
}
