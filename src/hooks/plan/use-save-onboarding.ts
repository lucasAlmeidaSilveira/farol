'use client'

import { useMutation } from '@tanstack/react-query'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'

import { db } from '@/data/firebase'
import { commitmentsCollection, incomeSourcesCollection } from '@/data/paths'
import {
  covenantPayload,
  fixedBillPayload,
  incomeSourcePayload,
} from '@/data/payloads'
import type { Cents } from '@/domain/money'
import { calendarPeriodOf, type Period, todayIn } from '@/domain/period'
import { useSession } from '@/providers/auth-provider'

/**
 * Grava o plano montado no onboarding.
 *
 * Aqui um `writeBatch` É seguro, ao contrário da criação do espaço: nenhuma
 * destas escritas depende de outra ter sido commitada. As rules só exigem
 * `canWrite(spaceId)`, que lê o documento de membro já existente.
 */

export type OnboardingDraft = {
  /** Renda fixa mensal. Vem de uma faixa, então quase sempre é estimada. */
  incomeCents: Cents
  incomeConfidence: 'exact' | 'estimated'
  incomeDay: number | null
  /** Liga o preset da Comunhão de Bens. */
  withCovenant: boolean
  bills: { label: string; amountCents: Cents; dueDay: number | null }[]
}

export function useSaveOnboarding() {
  const { spaceId } = useSession()

  return useMutation<void, Error, OnboardingDraft>({
    mutationFn: async (draft) => {
      if (!spaceId) throw new Error('Espaço não carregado')

      // A vigência começa no mês corrente: o plano vale de agora em diante, e
      // meses anteriores continuam vazios em vez de ganharem um salário
      // retroativo que nunca existiu.
      const from: Period = calendarPeriodOf(todayIn('America/Sao_Paulo'))
      const batch = writeBatch(db)
      const stamp = serverTimestamp()

      batch.set(
        doc(incomeSourcesCollection(spaceId)),
        incomeSourcePayload(
          {
            amountCents: draft.incomeCents,
            confidence: draft.incomeConfidence,
            expectedDay: draft.incomeDay,
          },
          from,
          stamp,
        ),
      )

      if (draft.withCovenant) {
        batch.set(
          doc(commitmentsCollection(spaceId)),
          covenantPayload(from, stamp),
        )
      }

      for (const bill of draft.bills) {
        batch.set(
          doc(commitmentsCollection(spaceId)),
          fixedBillPayload(from, bill, stamp),
        )
      }

      await batch.commit()
    },
  })
}
