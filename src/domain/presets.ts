import { basisPoints, type Cents } from './money'
import type { Period } from './period'
import type {
  Commitment,
  CommitmentBase,
  FixedAmountCommitment,
  ProportionalCommitment,
  SavingsGoalCommitment,
} from './types'

/**
 * Este é o ÚNICO arquivo do domínio que conhece nomes de compromissos reais.
 *
 * A engine não sabe o que é "Comunhão de Bens": ela sabe apurar um
 * `ProportionalCommitment` com N parcelas, base configurável, piso e teto.
 * Comunhão de Bens é um preset — um dado. Trocar as alíquotas, os rótulos ou a
 * base de cálculo é edição de dado, não deploy.
 *
 * A prova executável disso está em `presets.test.ts`: dízimo, INSS com teto,
 * poupança automática e pensão funcionam sem nenhuma linha nova na engine.
 */

/** Um compromisso ainda sem identidade nem auditoria — pronto para ser gravado. */
export type CommitmentDraft<T extends Commitment = Commitment> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'memberId'
>

const monthlyFrom = (from: Period) =>
  ({ from, until: null, frequency: { type: 'monthly' } }) as const

/** Toda a renda do mês entra na base: fixas e variáveis, sem exclusões. */
const ALL_INCOME: CommitmentBase = {
  includeFixed: true,
  includeVariable: true,
  excludedSourceIds: [],
  netOfPriorCommitments: false,
}

/** Só a renda fixa entra na base — a variável fica de fora. */
const FIXED_INCOME_ONLY: CommitmentBase = {
  includeFixed: true,
  includeVariable: false,
  excludedSourceIds: [],
  netOfPriorCommitments: false,
}

/**
 * Comunhão de Bens — 10% + 5% sobre TODA a renda do mês.
 *
 * Como a base inclui renda variável, o valor recalcula durante o mês: registrar
 * um freela de R$ 1.000 faz o compromisso subir R$ 150 na mesma hora.
 *
 * As duas parcelas são componentes separados para que a UI possa abrir a conta
 * ("Parcela 10%: R$ 355,00 · Parcela 5%: R$ 177,50"). O total é calculado com a
 * soma das alíquotas e depois rateado entre elas, para que a soma das parcelas
 * bata com o total sempre — inclusive quando o arredondamento é apertado.
 */
export function covenantPreset(
  from: Period,
): CommitmentDraft<ProportionalCommitment> {
  return {
    type: 'proportional',
    name: 'Comunhão de Bens',
    description: 'Compromisso mensal de 15% sobre toda a renda do mês.',
    order: 10,
    preset: 'covenant',
    recurrence: monthlyFrom(from),
    base: ALL_INCOME,
    parts: [
      { id: 'p1', label: 'Parcela 10%', rateBp: basisPoints(1000) },
      { id: 'p2', label: 'Parcela 5%', rateBp: basisPoints(500) },
    ],
    floorCents: null,
    ceilingCents: null,
    dueDay: null,
    // Quinto dia útil, a convenção do compromisso. NÃO é "dia 5": em agosto de
    // 2026, por exemplo, o quinto dia útil é dia 7.
    dueBusinessDay: 5,
  }
}

/** Dízimo — 10% sobre toda a renda, numa parcela só. */
export function tithePreset(
  from: Period,
): CommitmentDraft<ProportionalCommitment> {
  return {
    type: 'proportional',
    name: 'Dízimo',
    description: 'Compromisso mensal de 10% sobre toda a renda do mês.',
    order: 10,
    preset: 'tithe',
    recurrence: monthlyFrom(from),
    base: ALL_INCOME,
    parts: [{ id: 'p1', label: 'Dízimo', rateBp: basisPoints(1000) }],
    floorCents: null,
    ceilingCents: null,
    dueDay: null,
    dueBusinessDay: null,
  }
}

/**
 * Pague-se primeiro — guardar um percentual da renda fixa antes de gastar.
 * Incide só sobre a fixa porque o objetivo é uma reserva previsível.
 */
export function payYourselfFirstPreset(
  from: Period,
  rateBp: number,
): CommitmentDraft<ProportionalCommitment> {
  return {
    type: 'proportional',
    name: 'Guardar todo mês',
    description: 'Uma fatia da renda fixa reservada antes de qualquer gasto.',
    order: 20,
    preset: 'payYourselfFirst',
    recurrence: monthlyFrom(from),
    base: FIXED_INCOME_ONLY,
    parts: [{ id: 'p1', label: 'Reserva', rateBp: basisPoints(rateBp) }],
    floorCents: null,
    ceilingCents: null,
    dueDay: null,
    dueBusinessDay: null,
  }
}

/**
 * INSS — 11% com teto de contribuição, apurado ANTES dos demais (`order: 1`),
 * para que um compromisso com `netOfPriorCommitments` incida sobre o líquido.
 */
export function socialSecurityPreset(
  from: Period,
  ceilingCents: Cents,
): CommitmentDraft<ProportionalCommitment> {
  return {
    type: 'proportional',
    name: 'INSS',
    description: 'Contribuição de 11% sobre a renda fixa, limitada ao teto.',
    order: 1,
    preset: 'socialSecurity',
    recurrence: monthlyFrom(from),
    base: FIXED_INCOME_ONLY,
    parts: [{ id: 'p1', label: 'INSS', rateBp: basisPoints(1100) }],
    floorCents: null,
    ceilingCents,
    dueDay: null,
    dueBusinessDay: null,
  }
}

/** Pensão — percentual sobre a renda fixa líquida de descontos anteriores. */
export function alimonyPreset(
  from: Period,
  rateBp: number,
): CommitmentDraft<ProportionalCommitment> {
  return {
    type: 'proportional',
    name: 'Pensão',
    description: 'Percentual sobre a renda fixa, líquida dos descontos legais.',
    order: 5,
    preset: 'alimony',
    recurrence: monthlyFrom(from),
    base: { ...FIXED_INCOME_ONLY, netOfPriorCommitments: true },
    parts: [{ id: 'p1', label: 'Pensão', rateBp: basisPoints(rateBp) }],
    floorCents: null,
    ceilingCents: null,
    dueDay: null,
    dueBusinessDay: null,
  }
}

/** Uma conta fixa comum: aluguel, luz, assinatura. */
export function fixedBillDraft(
  from: Period,
  name: string,
  amountCents: Cents,
  dueDay: number | null,
): CommitmentDraft<FixedAmountCommitment> {
  return {
    type: 'fixedAmount',
    name,
    description: null,
    order: 100,
    preset: 'custom',
    recurrence: monthlyFrom(from),
    amountCents,
    dueDay,
    dueBusinessDay: null,
  }
}

/** Uma meta de reserva com prazo. Fora do MVP de UI, mas suportada pela engine. */
export function savingsGoalDraft(
  from: Period,
  name: string,
  targetCents: Cents,
  targetPeriod: Period,
): CommitmentDraft<SavingsGoalCommitment> {
  return {
    type: 'savingsGoal',
    name,
    description: null,
    order: 50,
    preset: 'custom',
    recurrence: monthlyFrom(from),
    targetCents,
    targetPeriod,
    minContributionCents: null,
    dueDay: null,
    dueBusinessDay: null,
  }
}

/**
 * Faixas de renda do onboarding.
 *
 * A pessoa não sabe quanto ganha — pedir um número exato trava o fluxo. Um
 * toque numa faixa grava o ponto médio com `confidence: 'estimated'`, e a UI
 * mostra "≈ R$ 3.250" com um lápis: o "≈" comunica sem palavras que é chute e
 * é editável.
 */
export const INCOME_BANDS = [
  { id: 'b1', label: 'até 1.500', minCents: 0, maxCents: 150_000 },
  { id: 'b2', label: '1.500 – 2.500', minCents: 150_000, maxCents: 250_000 },
  { id: 'b3', label: '2.500 – 4.000', minCents: 250_000, maxCents: 400_000 },
  { id: 'b4', label: '4.000 – 6.000', minCents: 400_000, maxCents: 600_000 },
  { id: 'b5', label: '6.000 – 10.000', minCents: 600_000, maxCents: 1_000_000 },
  {
    id: 'b6',
    label: 'mais de 10.000',
    minCents: 1_000_000,
    maxCents: 1_500_000,
  },
] as const

/** O ponto médio da faixa, arredondado para a dezena de reais mais próxima. */
export function bandMidpointCents(band: {
  minCents: number
  maxCents: number
}): Cents {
  const midpoint = Math.round((band.minCents + band.maxCents) / 2)
  return (Math.round(midpoint / 1000) * 1000) as Cents
}
