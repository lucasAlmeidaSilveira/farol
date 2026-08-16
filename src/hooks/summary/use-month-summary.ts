'use client'

import { useMemo } from 'react'

import type { SyncMeta } from '@/data/parse'
import type { Period } from '@/domain/period'
import { todayIn } from '@/domain/period'
import { computeMonth, type EngineInput, type MonthSummary } from '@/engine'
import {
  useMonthEntries,
  usePeriodPlan,
} from '@/hooks/entries/use-month-entries'
import { useCommitments, useIncomeSources } from '@/hooks/plan/use-plan'
import { useSpace } from '@/hooks/space/use-space'

/**
 * O número da home.
 *
 * NÃO é uma query — é a composição memoizada das quatro subscriptions passando
 * pela engine. É exatamente por isso que "+R$ 300 de freela → a folga sobe
 * R$ 255" acontece instantaneamente, e funciona offline: a escrita local
 * dispara o snapshot, o snapshot atualiza o cache, o `useMemo` recalcula.
 *
 * Zero código de optimistic update. Zero agregado gravado que possa divergir.
 */

export type MonthSummaryResult = {
  summary: MonthSummary | undefined
  /**
   * A entrada da engine, exposta para `simulateIncome`.
   *
   * O impacto de registrar uma renda é SEMPRE a diferença entre dois cálculos
   * completos — nunca a alíquota aplicada sobre o incremento, que arredonda
   * diferente e faria a tela mentir sobre o que vai acontecer ao salvar.
   */
  input: EngineInput | undefined
  pendingIds: string[]
  sync: SyncMeta | undefined
  isPending: boolean
  isError: boolean
  error: Error | null
  /** `true` quando não há nenhuma fonte de renda: a pessoa nunca fez o plano. */
  needsOnboarding: boolean
}

export function useMonthSummary(period: Period): MonthSummaryResult {
  const space = useSpace()
  const sources = useIncomeSources()
  const commitments = useCommitments()
  const month = useMonthEntries(period)
  const plan = usePeriodPlan(period)

  const parts = [space, sources, commitments, month, plan]

  const input = useMemo<EngineInput | undefined>(() => {
    if (
      !space.data ||
      !sources.data ||
      !commitments.data ||
      !month.data ||
      plan.data === undefined
    ) {
      return undefined
    }

    return {
      period,
      config: space.data.config,
      // O relógio é lido AQUI, na borda — a engine recebe `today` pronto e
      // continua sendo uma função pura e determinística.
      today: todayIn(space.data.config.timeZone),
      incomeSources: sources.data,
      commitments: commitments.data,
      plan: plan.data,
      entries: month.data.entries,
      // Metas de reserva não têm UI no MVP. Quando tiverem, este mapa vem de
      // uma query agregada sobre as quitações de períodos anteriores.
      carriedByCommitment: {},
    }
  }, [
    period,
    space.data,
    sources.data,
    commitments.data,
    month.data,
    plan.data,
  ])

  const summary = useMemo(
    () => (input ? computeMonth(input) : undefined),
    [input],
  )

  return {
    summary,
    input,
    pendingIds: month.data?.pendingIds ?? [],
    sync: month.data?.sync,
    isPending: parts.some((part) => part.isPending),
    isError: parts.some((part) => part.isError),
    error: parts.find((part) => part.error)?.error ?? null,
    needsOnboarding: sources.data?.length === 0,
  }
}
