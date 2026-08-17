import { type Cents, cents } from '@/domain/money'
import { calendarPeriodOf, todayIn } from '@/domain/period'
import { covenantPreset, fixedBillDraft } from '@/domain/presets'
import type {
  Commitment,
  CommitmentId,
  IncomeSource,
  IncomeSourceId,
  MemberId,
} from '@/domain/types'
import { computeMonth, type MonthSummary } from '@/engine'

/**
 * A prévia viva do onboarding, calculada pela MESMA engine que roda o app.
 *
 * Isso não é preciosismo: se a prévia usasse uma conta simplificada, o número
 * da revelação poderia diferir em centavos do número que aparece na home logo
 * depois — e a primeira impressão do produto seria a de um app que se
 * contradiz. Usando `computeMonth`, os dois são idênticos por construção.
 */

export type OnboardingState = {
  name: string
  incomeCents: Cents
  incomeConfidence: 'exact' | 'estimated'
  variableIncome: 'often' | 'sometimes' | 'never' | null
  withCovenant: boolean
  bills: { id: string; label: string; amountCents: Cents }[]
}

export const EMPTY_STATE: OnboardingState = {
  name: '',
  incomeCents: cents(0),
  incomeConfidence: 'estimated',
  variableIncome: null,
  withCovenant: true,
  bills: [],
}

const AUDIT = {
  memberId: null,
  createdBy: 'preview' as MemberId,
  createdAt: '',
  updatedAt: '',
  archivedAt: null,
}

export function previewSummary(state: OnboardingState): MonthSummary {
  const today = todayIn('America/Sao_Paulo')
  const period = calendarPeriodOf(today)

  const sources: IncomeSource[] = [
    {
      id: 'preview-income' as IncomeSourceId,
      name: 'Salário',
      kind: 'fixed',
      forecastCents: state.incomeCents,
      confidence: state.incomeConfidence,
      recurrence: { from: period, until: null, frequency: { type: 'monthly' } },
      expectedDay: null,
      expectedBusinessDay: null,
      ...AUDIT,
    },
  ]

  const commitments: Commitment[] = [
    ...(state.withCovenant
      ? [
          {
            ...covenantPreset(period),
            id: 'preview-covenant' as CommitmentId,
            ...AUDIT,
          } as Commitment,
        ]
      : []),
    ...state.bills
      .filter((bill) => bill.label.trim() !== '' && bill.amountCents > 0)
      .map(
        (bill) =>
          ({
            ...fixedBillDraft(period, bill.label, bill.amountCents, null),
            id: `preview-${bill.id}` as CommitmentId,
            ...AUDIT,
          }) as Commitment,
      ),
  ]

  return computeMonth({
    period,
    config: {
      cycleStart: { type: 'dayOfMonth', day: 1 },
      variableIncomePolicy: 'confirmedOnly',
      timeZone: 'America/Sao_Paulo',
      currency: 'BRL',
    },
    today,
    incomeSources: sources,
    commitments,
    plan: null,
    entries: [],
    carriedByCommitment: {},
  })
}
