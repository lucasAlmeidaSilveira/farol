import type { Cents } from '@/domain/money'
import { type LocalDate, type Period, periodOf } from '@/domain/period'
import { covenantPreset, fixedBillDraft } from '@/domain/presets'
import type {
  CategoryId,
  CommitmentId,
  CycleStartLike,
  DueRule,
  IncomeSourceId,
} from '@/domain/types'

/**
 * Os payloads exatos que vão para o Firestore, construídos por funções puras.
 *
 * Existem separados dos hooks por um motivo específico: schemas Zod, Security
 * Rules e engine foram escritos em momentos diferentes e podem discordar em
 * silêncio. Com os payloads isolados aqui, o teste de integração escreve
 * EXATAMENTE o que o app escreve — em vez de uma cópia que envelhece e passa a
 * testar outra coisa.
 *
 * `timestamp` entra como parâmetro (é o `serverTimestamp()` do SDK) para que
 * estas funções não precisem importar Firebase.
 */

type Stamp = unknown

const audit = (timestamp: Stamp) => ({
  createdAt: timestamp,
  updatedAt: timestamp,
  memberId: null,
  archivedAt: null,
})

export type IncomePlanInput = {
  amountCents: Cents
  confidence: 'exact' | 'estimated'
  expectedDay: number | null
}

export function incomeSourcePayload(
  input: IncomePlanInput,
  from: Period,
  timestamp: Stamp,
) {
  return {
    name: 'Salário',
    kind: 'fixed' as const,
    forecastCents: input.amountCents,
    confidence: input.confidence,
    recurrence: { from, until: null, frequency: { type: 'monthly' as const } },
    expectedDay: input.expectedDay,
    ...audit(timestamp),
  }
}

export function covenantPayload(from: Period, timestamp: Stamp) {
  return { ...covenantPreset(from), ...audit(timestamp) }
}

export function fixedBillPayload(
  from: Period,
  bill: { label: string; amountCents: Cents; dueRule?: DueRule | null },
  timestamp: Stamp,
) {
  const rule = bill.dueRule ?? null

  return {
    ...fixedBillDraft(from, bill.label, bill.amountCents, null),
    // Os dois campos vão juntos e são excludentes: gravar só um deixaria um
    // vencimento antigo sobreviver à troca de tipo.
    dueDay: rule?.type === 'dayOfMonth' ? rule.day : null,
    dueBusinessDay: rule?.type === 'businessDay' ? rule.n : null,
    ...audit(timestamp),
  }
}

/**
 * Ajuste pontual de um mês.
 *
 * Escrito com `merge`, mas `period` e `status` vão SEMPRE juntos: as rules
 * validam o documento pós-merge, e na primeira escrita eles ainda não existem.
 */
export function periodOverridePayload(
  period: Period,
  overrides: {
    incomeSourceOverrides?: Record<string, unknown>
    commitmentOverrides?: Record<string, unknown>
  },
  timestamp: Stamp,
) {
  return {
    period,
    status: 'open' as const,
    incomeSourceOverrides: overrides.incomeSourceOverrides ?? {},
    commitmentOverrides: overrides.commitmentOverrides ?? {},
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export const incomeSourceOverride = (forecastCents: Cents) => ({
  active: null,
  forecastCents,
})

export const commitmentOverrideOff = () => ({
  active: false,
  amountCents: null,
  rateBpByPart: null,
  contributionCents: null,
})

export const commitmentOverrideAmount = (amountCents: Cents) => ({
  active: null,
  amountCents,
  rateBpByPart: null,
  contributionCents: null,
})

export type EntryInput =
  | {
      kind: 'income'
      amountCents: Cents
      date: LocalDate
      description: string
      sourceId: IncomeSourceId | null
      closesForecast?: boolean
    }
  | {
      kind: 'expense'
      amountCents: Cents
      date: LocalDate
      description: string
      categoryId: CategoryId | null
    }
  | {
      kind: 'settlement'
      amountCents: Cents
      date: LocalDate
      description: string
      commitmentId: CommitmentId
    }

export function entryPayload(
  input: EntryInput,
  cycleStart: CycleStartLike,
  uid: string,
  timestamp: Stamp,
) {
  return {
    kind: input.kind,
    // O período é GRAVADO, não derivado na leitura. Se fosse derivado, mudar o
    // dia de início do ciclo reclassificaria todo o passado silenciosamente.
    period: periodOf(input.date, cycleStart),
    periodIsManual: false,
    date: input.date,
    amountCents: input.amountCents,
    description: input.description,
    memberId: uid,
    createdBy: uid,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...variantFields(input),
  }
}

function variantFields(input: EntryInput) {
  switch (input.kind) {
    case 'income':
      return {
        sourceId: input.sourceId,
        closesForecast: input.closesForecast ?? false,
      }
    case 'expense':
      return { categoryId: input.categoryId }
    case 'settlement':
      return { commitmentId: input.commitmentId, partId: null }
  }
}
