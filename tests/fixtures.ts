import { cents } from '@/domain/money'
import { localDate, period } from '@/domain/period'
import { covenantPreset } from '@/domain/presets'
import type {
  Commitment,
  CommitmentId,
  Entry,
  EntryId,
  IncomeSource,
  IncomeSourceId,
  MemberId,
  PeriodPlan,
  SpaceConfig,
} from '@/domain/types'
import type { EngineInput } from '@/engine'

/**
 * Fixtures do cenário canônico usado nos testes da engine:
 * salário de R$ 3.250,00 + Comunhão de Bens, competência 2026-08, ciclo dia 1.
 */

export const PERIOD = period('2026-08')
export const DAY_ONE = localDate('2026-08-01')
export const MID_MONTH = localDate('2026-08-14')

const MEMBER = 'member-1' as MemberId

const AUDIT = {
  memberId: null,
  createdBy: MEMBER,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
} as const

export const spaceConfig = (
  overrides: Partial<SpaceConfig> = {},
): SpaceConfig => ({
  cycleStart: { type: 'dayOfMonth', day: 1 },
  variableIncomePolicy: 'confirmedOnly',
  timeZone: 'America/Sao_Paulo',
  currency: 'BRL',
  ...overrides,
})

export const salary = (
  overrides: Partial<IncomeSource> = {},
): IncomeSource => ({
  id: 'src-salary' as IncomeSourceId,
  name: 'Salário',
  kind: 'fixed',
  forecastCents: cents(325_000),
  confidence: 'exact',
  recurrence: { from: period('2026-01'), until: null, frequency: { type: 'monthly' } },
  expectedDay: 5,
  archivedAt: null,
  ...AUDIT,
  ...overrides,
})

export const freelance = (
  overrides: Partial<IncomeSource> = {},
): IncomeSource => ({
  id: 'src-freela' as IncomeSourceId,
  name: 'Freelas',
  kind: 'variable',
  forecastCents: cents(0),
  confidence: 'estimated',
  recurrence: { from: period('2026-01'), until: null, frequency: { type: 'monthly' } },
  expectedDay: null,
  archivedAt: null,
  ...AUDIT,
  ...overrides,
})

export const covenant = (
  overrides: Partial<Commitment> = {},
): Commitment =>
  ({
    ...covenantPreset(period('2026-01')),
    id: 'cmt-covenant' as CommitmentId,
    archivedAt: null,
    ...AUDIT,
    ...overrides,
  }) as Commitment

export const fixedBill = (
  name: string,
  amountCents: number,
  overrides: Partial<Commitment> = {},
): Commitment =>
  ({
    id: `cmt-${name.toLowerCase()}` as CommitmentId,
    type: 'fixedAmount',
    name,
    description: null,
    order: 100,
    preset: 'custom',
    recurrence: {
      from: period('2026-01'),
      until: null,
      frequency: { type: 'monthly' },
    },
    amountCents: cents(amountCents),
    dueDay: 10,
    archivedAt: null,
    ...AUDIT,
    ...overrides,
  }) as Commitment

let entrySeq = 0
const nextId = () => `entry-${(entrySeq += 1)}` as EntryId

export const income = (
  amountCents: number,
  overrides: Partial<Extract<Entry, { kind: 'income' }>> = {},
): Entry => ({
  id: nextId(),
  kind: 'income',
  period: PERIOD,
  periodIsManual: false,
  date: MID_MONTH,
  amountCents: cents(amountCents),
  description: 'Entrada',
  sourceId: null,
  closesForecast: false,
  ...AUDIT,
  ...overrides,
})

export const expense = (
  amountCents: number,
  overrides: Partial<Extract<Entry, { kind: 'expense' }>> = {},
): Entry => ({
  id: nextId(),
  kind: 'expense',
  period: PERIOD,
  periodIsManual: false,
  date: MID_MONTH,
  amountCents: cents(amountCents),
  description: 'Gasto',
  categoryId: null,
  ...AUDIT,
  ...overrides,
})

export const settlement = (
  amountCents: number,
  commitmentId: string,
  overrides: Partial<Extract<Entry, { kind: 'settlement' }>> = {},
): Entry => ({
  id: nextId(),
  kind: 'settlement',
  period: PERIOD,
  periodIsManual: false,
  date: MID_MONTH,
  amountCents: cents(amountCents),
  description: 'Quitação',
  commitmentId: commitmentId as CommitmentId,
  partId: null,
  ...AUDIT,
  ...overrides,
})

export const plan = (overrides: Partial<PeriodPlan> = {}): PeriodPlan => ({
  period: PERIOD,
  status: 'open',
  incomeSourceOverrides: {},
  commitmentOverrides: {},
  close: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
})

/** Cenário base: salário R$ 3.250 + Comunhão de Bens, no dia 1 do mês. */
export const makeInput = (overrides: Partial<EngineInput> = {}): EngineInput => ({
  period: PERIOD,
  config: spaceConfig(),
  today: DAY_ONE,
  incomeSources: [salary()],
  commitments: [covenant()],
  plan: null,
  entries: [],
  carriedByCommitment: {},
  ...overrides,
})
