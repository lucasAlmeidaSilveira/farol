import type { BasisPoints, Cents } from './money'
import type { CycleStart, LocalDate, Period } from './period'

/**
 * O contrato entre engine, camada de dados e UI.
 *
 * Nada aqui pertence a um usuário: tudo pertence a um `Space`. É o que permite
 * o app virar de individual para casal sem migração de dados.
 */

declare const idBrand: unique symbol
export type Id<T extends string> = string & { readonly [idBrand]: T }

export type SpaceId = Id<'space'>
export type MemberId = Id<'member'> // = uid do Firebase Auth
export type IncomeSourceId = Id<'incomeSource'>
export type CommitmentId = Id<'commitment'>
export type CategoryId = Id<'category'>
export type EntryId = Id<'entry'>

/** Instante real, ISO 8601 com hora. Só para auditoria — nunca para cálculo. */
export type Instant = string

// -------------------------------------------------------------------- Space

export type MemberRole = 'owner' | 'member' | 'viewer'
export type MemberStatus = 'active' | 'invited' | 'suspended'

/**
 * Como a renda variável entra no "disponível para gastar":
 *
 * - `confirmedOnly` (padrão): a expectativa de um freela NÃO vira dinheiro para
 *   gastar. Conservador, e é o correto para quem não sabe quanto ganha.
 * - `includeForecast`: para quem tem variável estável e quer planejar em cima.
 *
 * É um flag lido pela engine, não um ramo de arquitetura.
 */
export type VariableIncomePolicy = 'confirmedOnly' | 'includeForecast'

export type SpaceConfig = {
  readonly cycleStart: CycleStart
  readonly variableIncomePolicy: VariableIncomePolicy
  readonly timeZone: string
  readonly currency: 'BRL'
}

/** Alias para quem só precisa do início do ciclo, sem arrastar o Space inteiro. */
export type CycleStartLike = CycleStart

export type Space = {
  readonly id: SpaceId
  readonly name: string
  readonly config: SpaceConfig
  readonly createdBy: MemberId
  readonly createdAt: Instant
  readonly updatedAt: Instant
}

export type Member = {
  readonly uid: MemberId
  readonly spaceId: SpaceId
  readonly role: MemberRole
  readonly status: MemberStatus
  readonly name: string
  readonly email: string | null
  readonly photoUrl: string | null
  readonly createdAt: Instant
  readonly updatedAt: Instant
}

// --------------------------------------------------------------- recorrência

export type Frequency =
  | { readonly type: 'monthly' }
  | {
      readonly type: 'everyNMonths'
      readonly n: number
      readonly anchor: Period
    }
  /** `month` 1-12. Cobre 13º salário, IPVA, IPTU. */
  | { readonly type: 'yearly'; readonly month: number }

/**
 * Uma recorrência NUNCA gera documentos. Uma fonte mensal com 10 anos de
 * vigência é 1 documento, não 120 — a materialização acontece em memória, ao
 * abrir o mês.
 *
 * A vigência é por período, nunca por data: encerrar um emprego é
 * `until = '2026-09'`, o que elimina a pergunta "o salário do dia 5 conta no
 * mês em que a fonte foi encerrada dia 20?".
 */
export type RecurrenceRule = {
  readonly from: Period
  readonly until: Period | null
  readonly frequency: Frequency
}

// ------------------------------------------------------------- IncomeSource

export type IncomeKind = 'fixed' | 'variable'

export type IncomeSource = {
  readonly id: IncomeSourceId
  readonly name: string
  readonly kind: IncomeKind
  /** Fixa: o valor esperado. Variável: expectativa, usada só no cenário previsto. */
  readonly forecastCents: Cents
  /** `estimated` quando veio de uma faixa do onboarding — a UI mostra "≈". */
  readonly confidence: 'exact' | 'estimated'
  /** `null` = fonte avulsa: só existe através de lançamentos. */
  readonly recurrence: RecurrenceRule | null
  /**
   * Dia do calendário em que a renda cai. Excludente com `expectedBusinessDay`.
   *
   * São dois campos anuláveis pela mesma razão de `dueDay`/`dueBusinessDay` nos
   * compromissos: é a forma que o Firestore e as Security Rules validam bem. A
   * união derivada sai de `expectedRuleOf`.
   */
  readonly expectedDay: number | null
  /**
   * Recebimento no N-ésimo dia útil. Excludente com `expectedDay`.
   *
   * Folha de pagamento usa esta convenção o tempo todo, e ela produz uma data
   * DIFERENTE de "dia N" quase todo mês — o quinto dia útil de agosto de 2026 é
   * dia 7, porque o mês começa num sábado.
   */
  readonly expectedBusinessDay: number | null
  readonly memberId: MemberId | null
  readonly archivedAt: LocalDate | null
  readonly createdAt: Instant
  readonly updatedAt: Instant
}

// --------------------------------------------------------------- Commitment

/** Quais rendas entram na base de cálculo de um compromisso proporcional. */
export type CommitmentBase = {
  readonly includeFixed: boolean
  /** Recebimentos avulsos, sem fonte, seguem este flag: são variáveis por definição. */
  readonly includeVariable: boolean
  readonly excludedSourceIds: readonly IncomeSourceId[]
  /**
   * Quando `true`, a base é a renda MENOS os compromissos de `order` menor já
   * apurados. Cobre "dízimo sobre o líquido depois do INSS" sem grafo de
   * dependências — a ordenação por inteiro torna ciclo impossível.
   */
  readonly netOfPriorCommitments: boolean
}

/** Uma parcela nomeada de um compromisso proporcional. */
export type CommitmentPart = {
  /** Estável ('p1', 'p2'): sobrevive a renomeação do rótulo. */
  readonly id: string
  readonly label: string
  readonly rateBp: BasisPoints
}

export type CommitmentPreset =
  | 'covenant'
  | 'tithe'
  | 'payYourselfFirst'
  | 'socialSecurity'
  | 'alimony'
  | 'custom'

/**
 * Quando o compromisso vence.
 *
 * `businessDay` NÃO é o mesmo que `dayOfMonth`: o quinto dia útil de agosto de
 * 2026 é dia 7, porque o mês começa num sábado. A convenção é usada em folha e
 * em compromissos mensais, e resolver como "dia 5" produziria uma data errada
 * quase todo mês.
 */
export type DueRule =
  | { readonly type: 'dayOfMonth'; readonly day: number }
  | { readonly type: 'businessDay'; readonly n: number }

type CommitmentCommon = {
  readonly id: CommitmentId
  readonly name: string
  readonly description: string | null
  /** Ordem de apuração, menor primeiro. Define o "líquido" dos posteriores. */
  readonly order: number
  readonly recurrence: RecurrenceRule
  readonly preset: CommitmentPreset
  readonly memberId: MemberId | null
  readonly archivedAt: LocalDate | null
  /**
   * Vencimento por dia do calendário. Excludente com `dueBusinessDay`.
   *
   * São dois campos anuláveis, e não uma união, porque é o formato que o
   * Firestore e as Security Rules validam bem — união exigiria um discriminador
   * gravado e um `map` aninhado. O domínio expõe a união derivada em
   * `dueRuleOf`, então a engine trabalha com o tipo certo.
   */
  readonly dueDay: number | null
  /** Vencimento no N-ésimo dia útil. Excludente com `dueDay`. */
  readonly dueBusinessDay: number | null
  readonly createdAt: Instant
  readonly updatedAt: Instant
}

export type FixedAmountCommitment = CommitmentCommon & {
  readonly type: 'fixedAmount'
  readonly amountCents: Cents
}

export type ProportionalCommitment = CommitmentCommon & {
  readonly type: 'proportional'
  readonly base: CommitmentBase
  readonly parts: readonly CommitmentPart[]
  readonly floorCents: Cents | null
  /** Ex.: teto do INSS. */
  readonly ceilingCents: Cents | null
}

export type SavingsGoalCommitment = CommitmentCommon & {
  readonly type: 'savingsGoal'
  readonly targetCents: Cents
  readonly targetPeriod: Period
  readonly minContributionCents: Cents | null
}

export type Commitment =
  FixedAmountCommitment | ProportionalCommitment | SavingsGoalCommitment

// -------------------------------------------------------------------- Entry

type EntryCommon = {
  readonly id: EntryId
  /**
   * Derivada da data + configuração de ciclo, mas GRAVADA no documento.
   *
   * Se fosse calculada em runtime, mudar o dia de início do ciclo
   * reclassificaria todo o passado silenciosamente. Gravada, o histórico é
   * estável.
   */
  readonly period: Period
  /** `true` quando o usuário sobrepôs o período sugerido pela data. */
  readonly periodIsManual: boolean
  readonly date: LocalDate
  readonly amountCents: Cents
  readonly description: string
  readonly memberId: MemberId | null
  readonly createdBy: MemberId
  readonly createdAt: Instant
  readonly updatedAt: Instant
}

export type IncomeEntry = EntryCommon & {
  readonly kind: 'income'
  /** `null` = avulso, tratado como renda variável. */
  readonly sourceId: IncomeSourceId | null
  /**
   * Encerra a previsão da fonte: a partir daí vale o recebido, não o previsto.
   * É o que faz "o salário veio menor este mês" funcionar.
   */
  readonly closesForecast: boolean
}

export type ExpenseEntry = EntryCommon & {
  readonly kind: 'expense'
  readonly categoryId: CategoryId | null
}

/**
 * Quitação de um compromisso.
 *
 * NÃO desconta do disponível: o valor já foi reservado quando o mês foi
 * calculado. Descontar de novo seria contar duas vezes — o erro mais fácil de
 * cometer neste tipo de app.
 */
export type SettlementEntry = EntryCommon & {
  readonly kind: 'settlement'
  readonly commitmentId: CommitmentId
  readonly partId: string | null
}

export type Entry = IncomeEntry | ExpenseEntry | SettlementEntry

export type Category = {
  readonly id: CategoryId
  readonly name: string
  readonly color: string
  readonly essential: boolean
  readonly archivedAt: LocalDate | null
}

// --------------------------------------------------------------- PeriodPlan

/** Sobrescrita de uma recorrência para um período específico. */
export type IncomeSourceOverride = {
  readonly active: boolean | null
  readonly forecastCents: Cents | null
}

export type CommitmentOverride = {
  readonly active: boolean | null
  readonly amountCents: Cents | null
  readonly rateBpByPart: Readonly<Record<string, BasisPoints>> | null
  readonly contributionCents: Cents | null
}

export type PeriodStatus = 'open' | 'closed'

/**
 * Só existe se o usuário editou ou fechou aquele mês. Abrir agosto de 2030 não
 * escreve nada.
 */
export type PeriodPlan = {
  readonly period: Period
  readonly status: PeriodStatus
  readonly incomeSourceOverrides: Readonly<Record<string, IncomeSourceOverride>>
  readonly commitmentOverrides: Readonly<Record<string, CommitmentOverride>>
  readonly close: CloseSnapshot | null
  readonly createdAt: Instant
  readonly updatedAt: Instant
}

export type CloseSnapshot = {
  readonly closedAt: Instant
  readonly closedBy: MemberId
  /** Se a regra da engine mudar, meses fechados NÃO mudam retroativamente. */
  readonly engineVersion: number
  /** `MonthSummary` serializado. */
  readonly summary: unknown
}

/**
 * A união derivada de um par de campos anuláveis. O dia do calendário tem
 * precedência — se ambos vierem preenchidos, o documento já está inconsistente
 * e as rules recusariam a escrita; aqui o que importa é não travar a leitura.
 */
function dayRuleOf(
  day: number | null,
  businessDay: number | null,
): DueRule | null {
  if (day !== null) return { type: 'dayOfMonth', day }
  if (businessDay !== null) return { type: 'businessDay', n: businessDay }
  return null
}

/** Quando o compromisso vence. */
export const dueRuleOf = (commitment: {
  dueDay: number | null
  dueBusinessDay: number | null
}): DueRule | null => dayRuleOf(commitment.dueDay, commitment.dueBusinessDay)

/** Quando a renda cai. */
export const expectedRuleOf = (source: {
  expectedDay: number | null
  expectedBusinessDay: number | null
}): DueRule | null => dayRuleOf(source.expectedDay, source.expectedBusinessDay)
