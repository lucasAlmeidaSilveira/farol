import { z } from 'zod'

import {
  basisPointsSchema,
  centsSchema,
  nonNegativeCentsSchema,
  positiveCentsSchema,
} from './money'
import {
  comparePeriods,
  cycleStartSchema,
  localDateSchema,
  type Period,
  periodSchema,
} from './period'
import type { Id } from './types'

/**
 * Os schemas são a fronteira entre o Firestore (que não tem tipos) e o domínio.
 * Todo documento lido é validado aqui antes de chegar na engine, e os mesmos
 * schemas espelham as Security Rules — para que uma escrita inválida nunca
 * entre na fila offline e volte a ser revertida minutos depois.
 */

const idSchema = <T extends string>() =>
  z
    .string()
    .min(1)
    .max(64)
    .transform((value) => value as Id<T>)

const instantSchema = z.string().min(1).max(40)

const nameSchema = z.string().trim().min(1).max(80)

// --------------------------------------------------------------- recorrência

export const frequencySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('monthly') }),
  z.object({
    type: z.literal('everyNMonths'),
    n: z.number().int().min(2).max(60),
    anchor: periodSchema,
  }),
  z.object({
    type: z.literal('yearly'),
    month: z.number().int().min(1).max(12),
  }),
])

export const recurrenceRuleSchema = z
  .object({
    from: periodSchema,
    until: periodSchema.nullable(),
    frequency: frequencySchema,
  })
  .superRefine((rule, ctx) => {
    if (rule.until && comparePeriods(rule.from, rule.until) > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['until'],
        message: 'O fim da vigência não pode ser anterior ao início',
      })
    }
  })

// -------------------------------------------------------------------- Space

export const spaceConfigSchema = z.object({
  cycleStart: cycleStartSchema,
  variableIncomePolicy: z.enum(['confirmedOnly', 'includeForecast']),
  timeZone: z.string().min(1).max(64),
  currency: z.literal('BRL'),
})

export const spaceSchema = z.object({
  id: idSchema<'space'>(),
  name: z.string().trim().min(1).max(60),
  config: spaceConfigSchema,
  createdBy: idSchema<'member'>(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
})

export const memberSchema = z.object({
  uid: idSchema<'member'>(),
  spaceId: idSchema<'space'>(),
  role: z.enum(['owner', 'member', 'viewer']),
  status: z.enum(['active', 'invited', 'suspended']),
  name: z.string().trim().min(1).max(120),
  email: z.string().max(254).nullable(),
  photoUrl: z.string().max(500).nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
})

// ------------------------------------------------------------- IncomeSource

export const incomeSourceSchema = z.object({
  id: idSchema<'incomeSource'>(),
  name: nameSchema,
  kind: z.enum(['fixed', 'variable']),
  forecastCents: nonNegativeCentsSchema,
  confidence: z.enum(['exact', 'estimated']),
  recurrence: recurrenceRuleSchema.nullable(),
  expectedDay: z.number().int().min(1).max(31).nullable(),
  memberId: idSchema<'member'>().nullable(),
  archivedAt: localDateSchema.nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
})

// --------------------------------------------------------------- Commitment

export const commitmentBaseSchema = z
  .object({
    includeFixed: z.boolean(),
    includeVariable: z.boolean(),
    excludedSourceIds: z.array(idSchema<'incomeSource'>()).max(50),
    netOfPriorCommitments: z.boolean(),
  })
  .refine(
    (base) => base.includeFixed || base.includeVariable,
    'A base de cálculo precisa incluir ao menos um tipo de renda',
  )

export const commitmentPartSchema = z.object({
  id: z.string().min(1).max(24),
  label: z.string().trim().min(1).max(60),
  rateBp: basisPointsSchema,
})

const commitmentCommonShape = {
  id: idSchema<'commitment'>(),
  name: nameSchema,
  description: z.string().max(280).nullable(),
  order: z.number().int().min(0).max(999),
  recurrence: recurrenceRuleSchema,
  preset: z.enum([
    'covenant',
    'tithe',
    'payYourselfFirst',
    'socialSecurity',
    'alimony',
    'custom',
  ]),
  memberId: idSchema<'member'>().nullable(),
  archivedAt: localDateSchema.nullable(),
  dueDay: z.number().int().min(1).max(31).nullable(),
  // 23 é o teto real: nenhum mês do calendário tem mais dias úteis que isso.
  dueBusinessDay: z.number().int().min(1).max(23).nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
}

/** Os dois campos de vencimento são excludentes: no máximo um preenchido. */
const exclusiveDue = <T extends { dueDay: number | null; dueBusinessDay: number | null }>(
  value: T,
  ctx: z.RefinementCtx,
) => {
  if (value.dueDay !== null && value.dueBusinessDay !== null) {
    ctx.addIssue({
      code: 'custom',
      path: ['dueBusinessDay'],
      message: 'Escolha vencimento por dia do mês OU por dia útil, não os dois',
    })
  }
}

export const commitmentSchema = z
  .discriminatedUnion('type', [
  z.object({
    ...commitmentCommonShape,
    type: z.literal('fixedAmount'),
    amountCents: nonNegativeCentsSchema,
  }),

  z.object({
    ...commitmentCommonShape,
    type: z.literal('proportional'),
    base: commitmentBaseSchema,
    parts: z
      .array(commitmentPartSchema)
      .min(1)
      .max(10)
      .superRefine((parts, ctx) => {
        if (new Set(parts.map((part) => part.id)).size !== parts.length) {
          ctx.addIssue({ code: 'custom', message: 'IDs de parcela duplicados' })
        }
        if (parts.reduce((sum, part) => sum + part.rateBp, 0) > 10_000) {
          ctx.addIssue({
            code: 'custom',
            message: 'A soma das alíquotas passa de 100%',
          })
        }
      }),
    floorCents: nonNegativeCentsSchema.nullable(),
    ceilingCents: nonNegativeCentsSchema.nullable(),
  }),

  z.object({
    ...commitmentCommonShape,
    type: z.literal('savingsGoal'),
    targetCents: positiveCentsSchema,
    targetPeriod: periodSchema,
    minContributionCents: nonNegativeCentsSchema.nullable(),
  }),
  ])
  .superRefine(exclusiveDue)

// -------------------------------------------------------------------- Entry

const entryCommonShape = {
  id: idSchema<'entry'>(),
  period: periodSchema,
  periodIsManual: z.boolean(),
  date: localDateSchema,
  description: z.string().trim().max(140),
  memberId: idSchema<'member'>().nullable(),
  createdBy: idSchema<'member'>(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
}

/** Um lançamento de valor zero é sempre um bug de entrada, nunca um dado. */
const nonZeroCentsSchema = centsSchema.refine(
  (value) => value !== 0,
  'O valor não pode ser zero',
)

export const entrySchema = z.discriminatedUnion('kind', [
  z.object({
    ...entryCommonShape,
    kind: z.literal('income'),
    // Renda nunca é negativa: entrada errada se apaga, não se estorna.
    amountCents: positiveCentsSchema,
    sourceId: idSchema<'incomeSource'>().nullable(),
    closesForecast: z.boolean(),
  }),
  z.object({
    ...entryCommonShape,
    kind: z.literal('expense'),
    // Negativo é estorno ou reembolso, e é legítimo.
    amountCents: nonZeroCentsSchema,
    categoryId: idSchema<'category'>().nullable(),
  }),
  z.object({
    ...entryCommonShape,
    kind: z.literal('settlement'),
    amountCents: nonZeroCentsSchema,
    commitmentId: idSchema<'commitment'>(),
    partId: z.string().max(24).nullable(),
  }),
])

export const categorySchema = z.object({
  id: idSchema<'category'>(),
  name: nameSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  essential: z.boolean(),
  archivedAt: localDateSchema.nullable(),
})

// --------------------------------------------------------------- PeriodPlan

export const incomeSourceOverrideSchema = z.object({
  active: z.boolean().nullable(),
  forecastCents: nonNegativeCentsSchema.nullable(),
})

export const commitmentOverrideSchema = z.object({
  active: z.boolean().nullable(),
  amountCents: nonNegativeCentsSchema.nullable(),
  rateBpByPart: z.record(z.string(), basisPointsSchema).nullable(),
  contributionCents: nonNegativeCentsSchema.nullable(),
})

export const periodPlanSchema = z.object({
  period: periodSchema,
  status: z.enum(['open', 'closed']),
  incomeSourceOverrides: z.record(z.string(), incomeSourceOverrideSchema),
  commitmentOverrides: z.record(z.string(), commitmentOverrideSchema),
  close: z
    .object({
      closedAt: instantSchema,
      closedBy: idSchema<'member'>(),
      engineVersion: z.number().int().min(1),
      summary: z.unknown(),
    })
    .nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
})

// ------------------------------------------------------------------ helpers

/** Um período no formato aceito pelo domínio, ou `null`. Para query params. */
export function parsePeriod(value: string | null | undefined): Period | null {
  if (!value) return null
  const result = periodSchema.safeParse(value)
  return result.success ? result.data : null
}
