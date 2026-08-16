import { atLeastZero, type Cents, divideFloor, ZERO } from '@/domain/money'
import { type Cycle, daysBetween, type LocalDate } from '@/domain/period'
import type { PeriodStatus } from '@/domain/types'

import type { Pace } from './types'

type PaceParams = {
  readonly cycle: Cycle
  readonly today: LocalDate
  readonly remainingToSpendCents: Cents
  readonly availableToSpendCents: Cents
  readonly freeExpenseCents: Cents
  readonly status: PeriodStatus
}

/**
 * O ritmo do mês: quanto dá para gastar por dia daqui até o fim.
 *
 * Duas decisões que parecem detalhe e não são:
 *
 * - A divisão usa PISO, não arredondamento. A sugestão diária multiplicada
 *   pelos dias restantes jamais pode passar do que a pessoa tem.
 * - `remainingDays` INCLUI hoje. No último dia do ciclo você ainda pode gastar
 *   o que sobrou; se não incluísse, a sugestão viraria zero um dia antes.
 */
export function calculatePace({
  cycle,
  today,
  remainingToSpendCents,
  availableToSpendCents,
  freeExpenseCents,
  status,
}: PaceParams): Pace {
  const ended = status === 'closed' || today > cycle.end
  const notStarted = today < cycle.start

  const elapsedDays = ended
    ? cycle.totalDays
    : notStarted
      ? 0
      : daysBetween(cycle.start, today) + 1

  const remainingDays = ended
    ? 0
    : notStarted
      ? cycle.totalDays
      : daysBetween(today, cycle.end) + 1

  const dailyPaceCents =
    remainingDays > 0
      ? divideFloor(atLeastZero(remainingToSpendCents), remainingDays)
      : null

  const averageDailySpendCents =
    elapsedDays > 0 ? divideFloor(freeExpenseCents, elapsedDays) : null

  const projectedSpendCents =
    averageDailySpendCents === null
      ? null
      : ((averageDailySpendCents * cycle.totalDays) as Cents)

  return {
    totalDays: cycle.totalDays,
    elapsedDays,
    remainingDays,
    dailyPaceCents,
    averageDailySpendCents,
    projectedSpendCents,
    status: resolveStatus({
      ended,
      elapsedDays,
      freeExpenseCents,
      remainingToSpendCents,
      availableToSpendCents,
      projectedSpendCents,
    }),
  }
}

type StatusParams = {
  readonly ended: boolean
  readonly elapsedDays: number
  readonly freeExpenseCents: Cents
  readonly remainingToSpendCents: Cents
  readonly availableToSpendCents: Cents
  readonly projectedSpendCents: Cents | null
}

function resolveStatus({
  ended,
  elapsedDays,
  freeExpenseCents,
  remainingToSpendCents,
  availableToSpendCents,
  projectedSpendCents,
}: StatusParams): Pace['status'] {
  if (ended) return 'ended'
  if (remainingToSpendCents < ZERO) return 'over'
  if (freeExpenseCents === ZERO && elapsedDays <= 1) return 'noData'
  if (
    projectedSpendCents !== null &&
    projectedSpendCents > availableToSpendCents
  ) {
    return 'ahead'
  }
  return 'onTrack'
}
