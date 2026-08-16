import { type Cents, subtract, ZERO } from '@/domain/money'
import type { LocalDate } from '@/domain/period'
import type {
  EntryId,
  IncomeEntry,
  IncomeSourceId,
  MemberId,
} from '@/domain/types'

import { computeMonth } from './compute'
import type { EngineInput, IncomeImpact } from './types'

/**
 * O impacto de registrar uma renda, calculado ANTES de salvar.
 *
 * REGRA QUE NÃO PODE SER QUEBRADA: nunca aplique a alíquota sobre o incremento.
 * O arredondamento incide no total, não no delta — e as duas contas divergem:
 *
 *   base R$ 0,10 -> 15% = R$ 0,02
 *   base R$ 0,20 -> 15% = R$ 0,03
 *   delta real do compromisso: R$ 0,01
 *   applyRate(delta): R$ 0,02   <- errado, e a tela mentiria
 *
 * Por isso o impacto é SEMPRE a diferença entre dois cálculos completos.
 */

export type IncomeDraft = {
  readonly amountCents: Cents
  readonly sourceId: IncomeSourceId | null
  readonly date: LocalDate
  readonly closesForecast: boolean
}

const DRAFT_ID = '__draft__' as EntryId
const DRAFT_MEMBER = '__draft__' as MemberId

export function simulateIncome(
  input: EngineInput,
  draft: IncomeDraft,
): IncomeImpact {
  const entry: IncomeEntry = {
    id: DRAFT_ID,
    kind: 'income',
    period: input.period,
    periodIsManual: false,
    date: draft.date,
    amountCents: draft.amountCents,
    description: '',
    sourceId: draft.sourceId,
    closesForecast: draft.closesForecast,
    memberId: null,
    createdBy: DRAFT_MEMBER,
    createdAt: '',
    updatedAt: '',
  }

  const before = computeMonth(input)
  const after = computeMonth({
    ...input,
    entries: [...input.entries, entry],
  })

  const beforeById = new Map(
    before.commitments.map((line) => [line.commitmentId, line.consideredCents]),
  )

  return {
    incomeCents: draft.amountCents,
    commitmentBeforeCents: before.totals.consideredCommitmentCents,
    commitmentAfterCents: after.totals.consideredCommitmentCents,
    commitmentDeltaCents: subtract(
      after.totals.consideredCommitmentCents,
      before.totals.consideredCommitmentCents,
    ),
    availableBeforeCents: before.totals.remainingToSpendCents,
    availableAfterCents: after.totals.remainingToSpendCents,
    availableDeltaCents: subtract(
      after.totals.remainingToSpendCents,
      before.totals.remainingToSpendCents,
    ),
    dailyPaceBeforeCents: before.pace.dailyPaceCents,
    dailyPaceAfterCents: after.pace.dailyPaceCents,
    byCommitment: after.commitments
      .map((line) => {
        const beforeCents = beforeById.get(line.commitmentId) ?? ZERO
        return {
          commitmentId: line.commitmentId,
          name: line.name,
          beforeCents,
          afterCents: line.consideredCents,
          deltaCents: subtract(line.consideredCents, beforeCents),
        }
      })
      .filter((item) => item.deltaCents !== ZERO),
  }
}
