'use client'

import { onSnapshot, orderBy, query, where } from 'firebase/firestore'

import { parseSnapshot, type SyncMeta, syncMetaOf } from '@/data/parse'
import { entriesCollection, periodDoc } from '@/data/paths'
import { keys } from '@/data/query-keys'
import type { Period } from '@/domain/period'
import { entrySchema, periodPlanSchema } from '@/domain/schemas'
import type { Entry, PeriodPlan } from '@/domain/types'
import { useFirestoreQuery } from '@/hooks/use-firestore-query'
import { useSession } from '@/providers/auth-provider'

export type MonthEntries = {
  entries: Entry[]
  /** Ids com escrita local ainda não confirmada pelo servidor. */
  pendingIds: string[]
  sync: SyncMeta
}

/**
 * Os lançamentos do mês, em UM listener.
 *
 * O `where('period','==',...)` é obrigatório e não é otimização: sem ele a
 * query lê a coleção inteira e o custo cresce para sempre. É também o motivo
 * de `period` ser gravado no documento em vez de derivado da data — derivar
 * significaria não conseguir filtrar por igualdade.
 *
 * `includeMetadataChanges` é o que permite o badge "salvo offline" virar
 * "sincronizado" quando a escrita chega no servidor.
 */
export function useMonthEntries(period: Period) {
  const { spaceId } = useSession()

  return useFirestoreQuery<MonthEntries>({
    queryKey: keys.entries(spaceId, period),
    enabled: spaceId !== null,
    subscribe: ({ next, error }) =>
      onSnapshot(
        query(
          entriesCollection(spaceId!),
          where('period', '==', period),
          orderBy('date', 'desc'),
        ),
        { includeMetadataChanges: true },
        (snapshot) => {
          const { items } = parseSnapshot(snapshot, entrySchema, 'entries')
          next({
            entries: items,
            pendingIds: snapshot.docs
              .filter((document) => document.metadata.hasPendingWrites)
              .map((document) => document.id),
            sync: syncMetaOf(snapshot),
          })
        },
        error,
      ),
  })
}

/**
 * O plano do mês — ajustes pontuais e status.
 *
 * O documento só existe se a pessoa editou ou fechou aquele mês. Abrir agosto
 * de 2030 devolve `null` e não escreve nada.
 */
export function usePeriodPlan(period: Period) {
  const { spaceId } = useSession()

  return useFirestoreQuery<PeriodPlan | null>({
    queryKey: keys.periodPlan(spaceId, period),
    enabled: spaceId !== null,
    subscribe: ({ next, error }) =>
      onSnapshot(
        periodDoc(spaceId!, period),
        (snapshot) =>
          next(
            snapshot.exists()
              ? // O id do documento é o próprio período, então o schema recebe
                // o campo já presente nos dados.
                (periodPlanSchema.safeParse({
                  ...snapshot.data({ serverTimestamps: 'estimate' }),
                  period,
                }).data ?? null)
              : null,
          ),
        error,
      ),
  })
}
