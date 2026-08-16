import type { BasisPoints, Cents } from '@/domain/money'
import type { Cycle, LocalDate, Period } from '@/domain/period'
import type {
  Commitment,
  CommitmentId,
  CommitmentPreset,
  DueRule,
  Entry,
  IncomeKind,
  IncomeSource,
  IncomeSourceId,
  PeriodPlan,
  PeriodStatus,
  SpaceConfig,
} from '@/domain/types'

import type { DueItem } from './due'

/** Incrementar quando a regra de cálculo mudar. Meses fechados guardam a sua. */
export const ENGINE_VERSION = 1

export type EngineInput = {
  readonly period: Period
  readonly config: SpaceConfig
  /**
   * Injetado, nunca lido do relógio dentro da engine. É o que torna o cálculo
   * determinístico e testável sem congelar o tempo.
   */
  readonly today: LocalDate
  readonly incomeSources: readonly IncomeSource[]
  readonly commitments: readonly Commitment[]
  readonly plan: PeriodPlan | null
  readonly entries: readonly Entry[]
  /**
   * Soma das quitações de TODOS os períodos anteriores, por compromisso.
   * Só `savingsGoal` usa. A camada de dados alimenta; a engine não consulta nada.
   */
  readonly carriedByCommitment: Readonly<Record<string, Cents>>
}

// -------------------------------------------------------------------- renda

export type IncomeLine = {
  readonly sourceId: IncomeSourceId | null
  readonly name: string
  readonly kind: IncomeKind
  readonly confidence: 'exact' | 'estimated'
  /** O que se espera receber. Zero para fontes que não vigoram neste período. */
  readonly forecastCents: Cents
  /** O que entrou de fato. */
  readonly receivedCents: Cents
  /** O número que a engine usa: previsto enquanto não confirmado, realizado depois. */
  readonly consideredCents: Cents
  /** Um recebimento marcou a previsão como encerrada: vale o recebido. */
  readonly forecastClosed: boolean
}

export type IncomeSummary = {
  readonly lines: readonly IncomeLine[]
  readonly forecastCents: Cents
  readonly receivedCents: Cents
  readonly consideredCents: Cents
}

// ------------------------------------------------------------- compromissos

export type CommitmentPartResult = {
  readonly id: string
  readonly label: string
  readonly rateBp: BasisPoints
  readonly amountCents: Cents
}

export type CommitmentLine = {
  readonly commitmentId: CommitmentId
  readonly name: string
  readonly type: Commitment['type']
  readonly preset: CommitmentPreset
  readonly order: number
  readonly dueRule: DueRule | null
  /** Base sobre a qual a alíquota incidiu no cenário considerado. */
  readonly baseCents: Cents
  readonly forecastCents: Cents
  /** O valor que vale: apurado sobre a renda considerada. */
  readonly consideredCents: Cents
  readonly parts: readonly CommitmentPartResult[]
  readonly clampedBy: 'floor' | 'ceiling' | null
  readonly settledCents: Cents
  readonly outstandingCents: Cents
  /** Pagou mais do que o apurado. O excedente vira gasto livre. */
  readonly overpaidCents: Cents
}

// ------------------------------------------------------------------ totais

export type MonthTotals = {
  readonly forecastIncomeCents: Cents
  readonly receivedIncomeCents: Cents
  readonly consideredIncomeCents: Cents
  readonly forecastCommitmentCents: Cents
  readonly consideredCommitmentCents: Cents
  readonly settledCommitmentCents: Cents
  readonly outstandingCommitmentCents: Cents
  readonly freeExpenseCents: Cents
  /** Planejamento puro: útil com ZERO lançamentos. */
  readonly forecastAvailableCents: Cents
  /** Renda considerada − compromissos considerados. PODE SER NEGATIVO. */
  readonly availableToSpendCents: Cents
  /** O NÚMERO GRANDE DA HOME: disponível − gastos livres. */
  readonly remainingToSpendCents: Cents
  readonly variance: {
    readonly incomeCents: Cents
    readonly commitmentCents: Cents
    readonly availableCents: Cents
  }
}

// ------------------------------------------------------------------- ritmo

export type PaceStatus = 'noData' | 'onTrack' | 'ahead' | 'over' | 'ended'

export type Pace = {
  readonly totalDays: number
  /** Inclui hoje. */
  readonly elapsedDays: number
  /** Inclui hoje: no último dia ainda dá para gastar o que sobrou. */
  readonly remainingDays: number
  /** `null` quando não há dias restantes — `0` seria lido como "não pode gastar". */
  readonly dailyPaceCents: Cents | null
  readonly averageDailySpendCents: Cents | null
  readonly projectedSpendCents: Cents | null
  readonly status: PaceStatus
}

// ------------------------------------------------------------------ alertas

export type Alert =
  | { readonly code: 'NO_INCOME' }
  | { readonly code: 'COMMITMENTS_EXCEED_INCOME'; readonly deficitCents: Cents }
  | {
      readonly code: 'COMMITMENT_OUTSTANDING'
      readonly commitmentId: CommitmentId
      readonly name: string
      readonly amountCents: Cents
    }
  | {
      readonly code: 'FORECAST_UNCONFIRMED'
      readonly sourceId: IncomeSourceId
      readonly name: string
    }
  | {
      readonly code: 'GOAL_OVERDUE'
      readonly commitmentId: CommitmentId
      readonly name: string
    }

// ------------------------------------------------------------------ resumo

export type MonthSummary = {
  readonly engineVersion: number
  readonly period: Period
  readonly cycle: Cycle
  readonly status: PeriodStatus
  readonly income: IncomeSummary
  readonly commitments: readonly CommitmentLine[]
  readonly totals: MonthTotals
  readonly pace: Pace
  /** Contas com vencimento, já ordenadas: atrasadas primeiro, depois por data. */
  readonly due: readonly DueItem[]
  readonly alerts: readonly Alert[]
}

// ------------------------------------------------------------- simulação

export type IncomeImpact = {
  readonly incomeCents: Cents
  readonly commitmentBeforeCents: Cents
  readonly commitmentAfterCents: Cents
  readonly commitmentDeltaCents: Cents
  readonly availableBeforeCents: Cents
  readonly availableAfterCents: Cents
  readonly availableDeltaCents: Cents
  readonly dailyPaceBeforeCents: Cents | null
  readonly dailyPaceAfterCents: Cents | null
  readonly byCommitment: readonly {
    readonly commitmentId: CommitmentId
    readonly name: string
    readonly beforeCents: Cents
    readonly afterCents: Cents
    readonly deltaCents: Cents
  }[]
}
