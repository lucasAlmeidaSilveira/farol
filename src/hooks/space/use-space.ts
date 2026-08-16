'use client'

import { onSnapshot } from 'firebase/firestore'

import { parseDocument } from '@/data/parse'
import { spaceDoc } from '@/data/paths'
import { keys } from '@/data/query-keys'
import { spaceSchema } from '@/domain/schemas'
import type { Space } from '@/domain/types'
import { useFirestoreQuery } from '@/hooks/use-firestore-query'
import { useSession } from '@/providers/auth-provider'

/** O espaço financeiro ativo, com a configuração de ciclo e política de renda. */
export function useSpace() {
  const { spaceId } = useSession()

  const query = useFirestoreQuery<Space | null>({
    queryKey: keys.space(spaceId),
    enabled: spaceId !== null,
    subscribe: ({ next, error }) =>
      onSnapshot(
        spaceDoc(spaceId!),
        (snapshot) => next(parseDocument(snapshot, spaceSchema, 'spaces')),
        error,
      ),
  })

  return { ...query, spaceId }
}
