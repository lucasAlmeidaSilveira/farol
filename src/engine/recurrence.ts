import { ZERO } from '@/domain/money'
import {
  comparePeriods,
  monthsBetween,
  type Period,
  yearMonth,
} from '@/domain/period'
import type {
  Commitment,
  IncomeSource,
  PeriodPlan,
  RecurrenceRule,
} from '@/domain/types'

/**
 * Recorrência nunca gera documento. A materialização acontece aqui, em memória,
 * no instante em que o mês é aberto — a partir da regra de vigência mais os
 * ajustes pontuais daquele período.
 */

export function isActiveIn(rule: RecurrenceRule, period: Period): boolean {
  if (comparePeriods(period, rule.from) < 0) return false
  if (rule.until !== null && comparePeriods(period, rule.until) > 0)
    return false

  switch (rule.frequency.type) {
    case 'monthly':
      return true

    case 'yearly':
      return yearMonth(period).month === rule.frequency.month

    case 'everyNMonths': {
      const delta = monthsBetween(rule.frequency.anchor, period)
      // O `delta >= 0` protege contra módulo negativo em períodos anteriores
      // à âncora, que em JS devolveria um resto negativo.
      return delta >= 0 && delta % rule.frequency.n === 0
    }
  }
}

export type MaterializedSource = {
  readonly source: IncomeSource
  /**
   * A previsão desta fonte vale neste período. Quando `false`, a fonte só
   * aparece porque teve recebimento — e aí só o recebido conta.
   */
  readonly forecastApplies: boolean
}

/**
 * Fontes que participam do período: as vigentes, mais as que não vigoram mas
 * receberam dinheiro (arquivar uma fonte nunca pode apagar o histórico).
 */
export function materializeIncomeSources(
  sources: readonly IncomeSource[],
  period: Period,
  plan: PeriodPlan | null,
  referencedIds: ReadonlySet<string>,
): MaterializedSource[] {
  return sources.flatMap<MaterializedSource>((source) => {
    const override = plan?.incomeSourceOverrides[source.id]
    const activeByRule =
      source.recurrence !== null && isActiveIn(source.recurrence, period)
    const active = override?.active ?? activeByRule

    if (!active) {
      return referencedIds.has(source.id)
        ? [
            {
              source: { ...source, forecastCents: ZERO },
              forecastApplies: false,
            },
          ]
        : []
    }

    return [
      {
        source: {
          ...source,
          forecastCents: override?.forecastCents ?? source.forecastCents,
        },
        forecastApplies: true,
      },
    ]
  })
}

/**
 * Compromissos vigentes no período, com os ajustes aplicados e já ordenados
 * por `order`. O desempate por id mantém o resultado determinístico.
 */
export function materializeCommitments(
  commitments: readonly Commitment[],
  period: Period,
  plan: PeriodPlan | null,
): Commitment[] {
  return commitments
    .flatMap<Commitment>((commitment) => {
      const override = plan?.commitmentOverrides[commitment.id]
      const active =
        override?.active ?? isActiveIn(commitment.recurrence, period)
      if (!active) return []

      switch (commitment.type) {
        case 'fixedAmount':
          return [
            {
              ...commitment,
              amountCents: override?.amountCents ?? commitment.amountCents,
            },
          ]

        case 'proportional': {
          const rates = override?.rateBpByPart
          if (!rates) return [commitment]
          return [
            {
              ...commitment,
              parts: commitment.parts.map((part) => ({
                ...part,
                rateBp: rates[part.id] ?? part.rateBp,
              })),
            },
          ]
        }

        case 'savingsGoal':
          return [
            {
              ...commitment,
              minContributionCents:
                override?.contributionCents ?? commitment.minContributionCents,
            },
          ]
      }
    })
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}
