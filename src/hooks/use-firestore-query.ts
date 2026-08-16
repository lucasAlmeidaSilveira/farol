'use client'

import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

import { acquireSubscription, type SubscribeFn } from '@/data/subscription'

/**
 * A ponte entre o `onSnapshot` do Firestore e o cache do TanStack Query.
 *
 * Duas configurações aqui não são preferência, são consequência direta do
 * modelo de custo do Firestore:
 *
 * - `staleTime: Infinity` — o socket é a fonte de frescor. Qualquer refetch é
 *   leitura desperdiçada, e leitura no Firestore é dinheiro.
 * - `refetchOnWindowFocus/Reconnect: false` — pela mesma razão. O listener já
 *   traz tudo o que mudou.
 *
 * Consequência que surpreende quem vem de REST: `invalidateQueries` depois de
 * uma mutação é ANTI-PADRÃO aqui. O listener ecoa a escrita de volta sozinho,
 * localmente, antes mesmo de chegar no servidor. Invalidar dispararia uma
 * leitura extra para receber o que já chegou.
 */

type UseFirestoreQueryOptions<T> = {
  queryKey: readonly unknown[]
  /**
   * Abre o `onSnapshot`. Deve depender APENAS de valores presentes na
   * `queryKey` — é ela que identifica a subscription no registry.
   */
  subscribe: SubscribeFn<T>
  enabled?: boolean
} & Omit<
  UseQueryOptions<T, Error, T, readonly unknown[]>,
  'queryKey' | 'queryFn' | 'enabled'
>

export function useFirestoreQuery<T>({
  queryKey,
  subscribe,
  enabled = true,
  ...options
}: UseFirestoreQueryOptions<T>): UseQueryResult<T, Error> {
  const queryClient = useQueryClient()

  /*
    Identidade estável para o efeito, sempre chamando a closure mais recente.

    A atualização do ref acontece num efeito, não durante o render: o React 19
    passou a tratar escrita em ref no render como erro, e com razão — no modo
    concorrente o render pode ser descartado, deixando o ref adiantado em
    relação ao que foi de fato renderizado.

    Isto é seguro aqui porque o `queryFn` roda de forma assíncrona, sempre
    depois do efeito ter rodado, e a primeira leitura já tem o valor inicial
    passado ao `useRef`.
  */
  const subscribeRef = useRef(subscribe)

  useEffect(() => {
    subscribeRef.current = subscribe
  }, [subscribe])

  const stableSubscribe = useCallback<SubscribeFn<T>>(
    (emit) => subscribeRef.current(emit),
    [],
  )

  const query = useQuery<T, Error, T, readonly unknown[]>({
    queryKey,
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { first, release } = acquireSubscription(
        queryClient,
        queryKey,
        stableSubscribe,
      )

      try {
        return await first
      } finally {
        // Solta a referência do fetch. O keep-alive do registry segura o
        // listener vivo até o efeito abaixo assumir o ciclo de vida.
        release()
      }
    },
    ...options,
  })

  const hash = JSON.stringify(queryKey)

  useEffect(() => {
    if (!enabled) return

    const { release } = acquireSubscription(
      queryClient,
      JSON.parse(hash) as readonly unknown[],
      stableSubscribe,
    )

    return release
  }, [queryClient, enabled, hash, stableSubscribe])

  return query
}
