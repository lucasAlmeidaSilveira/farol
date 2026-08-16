'use client'

import { onSnapshot, orderBy, query } from 'firebase/firestore'

import { parseSnapshot } from '@/data/parse'
import { commitmentsCollection, incomeSourcesCollection } from '@/data/paths'
import { keys } from '@/data/query-keys'
import { commitmentSchema, incomeSourceSchema } from '@/domain/schemas'
import type { Commitment, IncomeSource } from '@/domain/types'
import { useFirestoreQuery } from '@/hooks/use-firestore-query'
import { useSession } from '@/providers/auth-provider'

/**
 * Fontes de renda e compromissos são lidos INTEIROS, sem filtro de vigência.
 *
 * São dezenas de documentos, carregados uma vez por sessão. Filtrar por
 * vigência no Firestore exigiria índices e transformaria uma regra de domínio
 * testável (`isActiveIn`) numa query — que ninguém consegue testar sem rede.
 */

export function useIncomeSources() {
  const { spaceId } = useSession()

  return useFirestoreQuery<IncomeSource[]>({
    queryKey: keys.incomeSources(spaceId),
    enabled: spaceId !== null,
    subscribe: ({ next, error }) =>
      onSnapshot(
        query(incomeSourcesCollection(spaceId!), orderBy('name')),
        (snapshot) =>
          next(
            parseSnapshot(snapshot, incomeSourceSchema, 'incomeSources').items,
          ),
        error,
      ),
  })
}

export function useCommitments() {
  const { spaceId } = useSession()

  return useFirestoreQuery<Commitment[]>({
    queryKey: keys.commitments(spaceId),
    enabled: spaceId !== null,
    subscribe: ({ next, error }) =>
      onSnapshot(
        query(commitmentsCollection(spaceId!), orderBy('order')),
        (snapshot) =>
          next(parseSnapshot(snapshot, commitmentSchema, 'commitments').items),
        error,
      ),
  })
}
