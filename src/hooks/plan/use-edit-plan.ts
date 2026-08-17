'use client'

import { useMutation } from '@tanstack/react-query'
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { toast } from 'sonner'

import {
  commitmentDoc,
  commitmentsCollection,
  incomeSourceDoc,
  incomeSourcesCollection,
  periodDoc,
} from '@/data/paths'
import {
  commitmentOverrideAmount,
  commitmentOverrideOff,
  expectedDayFields,
  fixedBillPayload,
  incomeSourceOverride,
  periodOverridePayload,
} from '@/data/payloads'
import { errorMessage } from '@/data/session'
import { installmentUntil } from '@/domain/installments'
import type { Cents } from '@/domain/money'
import { addMonths, comparePeriods, type Period } from '@/domain/period'
import type {
  CommitmentId,
  DueRule,
  IncomeSource,
  IncomeSourceId,
} from '@/domain/types'
import { useSession } from '@/providers/auth-provider'

/**
 * Edição do plano.
 *
 * A distinção entre "só neste mês" e "deste mês em diante" é a decisão de
 * produto mais importante desta tela, e ela existe para PRESERVAR O HISTÓRICO.
 *
 * Quem recebe um aumento em julho não deve ver o salário de junho virar o valor
 * novo retroativamente — isso reescreveria meses já vividos e destruiria a
 * confiança no histórico. Por isso:
 *
 * - "só neste mês"        -> grava um ajuste no documento do período
 * - "deste mês em diante" -> encerra a vigência da regra atual e cria uma nova
 */

export type EditScope = 'thisMonth' | 'fromNowOn'

// ------------------------------------------------------------ renda fixa

export function useEditIncomeForecast(period: Period) {
  const { spaceId } = useSession()

  return useMutation<
    void,
    Error,
    {
      source: IncomeSource
      name: string
      amountCents: Cents
      expectedRule: DueRule | null
      scope: EditScope
    }
  >({
    mutationFn: async ({ source, name, amountCents, expectedRule, scope }) => {
      if (!spaceId) throw new Error('Espaço não carregado')

      try {
        /*
          O dia é característica da fonte, não valor do mês: o modelo não guarda
          dia por competência. Por isso ele é gravado sempre, mesmo quando o
          escopo do VALOR é só este mês. A UI diz isso explicitamente.
        */
        const fields = expectedDayFields(expectedRule)

        if (
          fields.expectedDay !== source.expectedDay ||
          fields.expectedBusinessDay !== source.expectedBusinessDay ||
          name !== source.name
        ) {
          await updateDoc(incomeSourceDoc(spaceId, source.id), {
            name,
            ...fields,
            updatedAt: serverTimestamp(),
          })
        }

        if (scope === 'thisMonth') {
          await setDoc(
            periodDoc(spaceId, period),
            periodOverridePayload(
              period,
              {
                incomeSourceOverrides: {
                  [source.id]: incomeSourceOverride(amountCents),
                },
              },
              serverTimestamp(),
            ),
            { merge: true },
          )
          return
        }

        const startsThisPeriod =
          source.recurrence !== null &&
          comparePeriods(source.recurrence.from, period) >= 0

        // Se a regra já começa neste mês, não há histórico a preservar:
        // editar no lugar é mais simples e não deixa um documento órfão.
        if (startsThisPeriod || source.recurrence === null) {
          await updateDoc(incomeSourceDoc(spaceId, source.id), {
            forecastCents: amountCents,
            confidence: 'exact',
            updatedAt: serverTimestamp(),
          })
          return
        }

        // Encerra a regra antiga no mês anterior e cria a nova valendo daqui
        // em diante. Junho continua sendo junho.
        await updateDoc(incomeSourceDoc(spaceId, source.id), {
          recurrence: {
            ...source.recurrence,
            until: addMonths(period, -1),
          },
          updatedAt: serverTimestamp(),
        })

        await setDoc(doc(incomeSourcesCollection(spaceId)), {
          name,
          kind: source.kind,
          forecastCents: amountCents,
          confidence: 'exact',
          recurrence: {
            from: period,
            until: null,
            frequency: source.recurrence.frequency,
          },
          expectedDay: source.expectedDay,
          expectedBusinessDay: source.expectedBusinessDay,
          memberId: null,
          archivedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        toast.error(errorMessage(error))
        throw error
      }
    },
  })
}

// ----------------------------------------------------------- compromissos

export function useAddFixedBill(period: Period) {
  const { spaceId } = useSession()

  return useMutation<
    void,
    Error,
    {
      label: string
      amountCents: Cents
      dueRule: DueRule | null
      /** Compra parcelada: quantas vezes. `null` = conta sem fim. */
      installments?: number | null
    }
  >({
    mutationFn: async (bill) => {
      if (!spaceId) throw new Error('Espaço não carregado')

      try {
        await setDoc(
          doc(commitmentsCollection(spaceId)),
          fixedBillPayload(
            period,
            {
              ...bill,
              until: bill.installments
                ? installmentUntil(period, bill.installments)
                : null,
            },
            serverTimestamp(),
          ),
        )
      } catch (error) {
        toast.error(errorMessage(error))
        throw error
      }
    },
  })
}

export function useEditFixedBill(period: Period) {
  const { spaceId } = useSession()

  return useMutation<
    void,
    Error,
    {
      commitmentId: CommitmentId
      name: string
      amountCents: Cents
      dueRule: DueRule | null
      currentDueRule: DueRule | null
      scope: EditScope
    }
  >({
    mutationFn: async ({
      commitmentId,
      name,
      amountCents,
      dueRule,
      currentDueRule,
      scope,
    }) => {
      if (!spaceId) throw new Error('Espaço não carregado')

      try {
        // Mesma razão da renda: nome e vencimento são da conta, não do mês.
        if (JSON.stringify(dueRule) !== JSON.stringify(currentDueRule)) {
          await updateDoc(commitmentDoc(spaceId, commitmentId), {
            // Os dois campos são gravados juntos porque são excludentes: sem
            // zerar o outro, um vencimento antigo sobreviveria à troca de tipo.
            dueDay: dueRule?.type === 'dayOfMonth' ? dueRule.day : null,
            dueBusinessDay: dueRule?.type === 'businessDay' ? dueRule.n : null,
            updatedAt: serverTimestamp(),
          })
        }

        await updateDoc(commitmentDoc(spaceId, commitmentId), {
          name,
          updatedAt: serverTimestamp(),
        })

        if (scope === 'thisMonth') {
          await setDoc(
            periodDoc(spaceId, period),
            periodOverridePayload(
              period,
              {
                commitmentOverrides: {
                  [commitmentId]: commitmentOverrideAmount(amountCents),
                },
              },
              serverTimestamp(),
            ),
            { merge: true },
          )
          return
        }

        await updateDoc(commitmentDoc(spaceId, commitmentId), {
          amountCents,
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        toast.error(errorMessage(error))
        throw error
      }
    },
  })
}

/**
 * Remover um compromisso.
 *
 * "Só neste mês" desliga via ajuste, preservando a regra. "De vez" apaga o
 * documento — e aí os meses PASSADOS perdem o compromisso também. É por isso
 * que a UI precisa deixar a diferença explícita antes de confirmar.
 */
export function useRemoveCommitment(period: Period) {
  const { spaceId } = useSession()

  return useMutation<
    void,
    Error,
    { commitmentId: CommitmentId; scope: EditScope }
  >({
    mutationFn: async ({ commitmentId, scope }) => {
      if (!spaceId) throw new Error('Espaço não carregado')

      try {
        if (scope === 'thisMonth') {
          await setDoc(
            periodDoc(spaceId, period),
            periodOverridePayload(
              period,
              {
                commitmentOverrides: {
                  [commitmentId]: commitmentOverrideOff(),
                },
              },
              serverTimestamp(),
            ),
            { merge: true },
          )
          return
        }

        await deleteDoc(commitmentDoc(spaceId, commitmentId))
      } catch (error) {
        toast.error(errorMessage(error))
        throw error
      }
    },
  })
}

export function useAddIncomeSource(period: Period) {
  const { spaceId } = useSession()

  return useMutation<
    void,
    Error,
    {
      name: string
      kind: 'fixed' | 'variable'
      amountCents: Cents
      expectedRule: DueRule | null
    }
  >({
    mutationFn: async (income) => {
      if (!spaceId) throw new Error('Espaço não carregado')

      try {
        await setDoc(doc(incomeSourcesCollection(spaceId)), {
          name: income.name,
          kind: income.kind,
          forecastCents: income.amountCents,
          // Digitado à mão é valor exato; o "≈" some da tela.
          confidence: 'exact',
          recurrence: {
            from: period,
            until: null,
            frequency: { type: 'monthly' },
          },
          ...expectedDayFields(income.expectedRule),
          memberId: null,
          archivedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        toast.error(errorMessage(error))
        throw error
      }
    },
  })
}

export function useRemoveIncomeSource() {
  const { spaceId } = useSession()

  return useMutation<void, Error, IncomeSourceId>({
    mutationFn: async (sourceId) => {
      if (!spaceId) throw new Error('Espaço não carregado')

      try {
        await deleteDoc(incomeSourceDoc(spaceId, sourceId))
      } catch (error) {
        toast.error(errorMessage(error))
        throw error
      }
    },
  })
}
