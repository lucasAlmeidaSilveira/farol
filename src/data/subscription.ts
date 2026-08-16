import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type { FirestoreError, Unsubscribe } from 'firebase/firestore'

/**
 * Registry de listeners do Firestore, com contagem de referências.
 *
 * O Firestore é dono da verdade; o TanStack Query é dono do cache. Cada
 * snapshot é empurrado para o cache via `setQueryData`, e o `queryFn` existe
 * apenas para resolver o PRIMEIRO snapshot — assim `isPending`, `error` e os
 * DevTools continuam funcionando como no resto do app.
 *
 * A contagem de referências existe por uma razão concreta de custo: leitura no
 * Firestore é dinheiro. Três componentes montando a mesma query precisam gerar
 * UM listener, não três.
 *
 * REGRA DE REVIEW: se `onSnapshot` aparecer fora de `src/data/` ou
 * `src/hooks/`, é bug.
 */

/**
 * Quanto tempo o listener sobrevive depois que o último consumidor desmonta.
 *
 * Cobre navegações rápidas (Hoje -> Mês -> Hoje) sem pagar leitura de novo, e
 * cobre a janela entre o `queryFn` resolver e o `useEffect` assumir o ciclo de
 * vida — sem isso, o listener seria fechado e reaberto a cada montagem.
 */
const KEEP_ALIVE_MS = 30_000

export type Emitter<T> = {
  next: (data: T) => void
  error: (error: FirestoreError) => void
}

export type SubscribeFn<T> = (emit: Emitter<T>) => Unsubscribe

export type Subscription<T> = {
  /** Resolve no primeiro snapshot. É o que o `queryFn` aguarda. */
  first: Promise<T>
  release: () => void
}

type Registration = {
  refCount: number
  unsubscribe: Unsubscribe
  first: Promise<unknown>
  teardown?: ReturnType<typeof setTimeout>
}

const registry = new Map<string, Registration>()

export function acquireSubscription<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  subscribeFn: SubscribeFn<T>,
): Subscription<T> {
  const hash = JSON.stringify(queryKey)
  const existing = registry.get(hash)

  if (existing) {
    clearTimeout(existing.teardown)
    existing.teardown = undefined
    existing.refCount += 1
    return {
      first: existing.first as Promise<T>,
      release: () => release(hash),
    }
  }

  let settle!: (data: T) => void
  let fail!: (error: unknown) => void
  let settled = false

  const first = new Promise<T>((resolve, reject) => {
    settle = resolve
    fail = reject
  })

  const unsubscribe = subscribeFn({
    next: (data) => {
      if (!settled) {
        settled = true
        settle(data)
        return
      }
      // Snapshots seguintes não passam pelo queryFn: vão direto para o cache.
      queryClient.setQueryData(queryKey, data)
    },

    error: (error) => {
      // O Firestore já encerrou o listener ao emitir erro, então descartamos o
      // registro para que a próxima aquisição abra um listener novo.
      registry.delete(hash)

      if (!settled) {
        settled = true
        fail(error)
        return
      }

      // Já havia funcionado antes (token expirou, regra mudou). Marcar como
      // stale faz o Query rodar o queryFn de novo e reabrir a subscription.
      void queryClient.invalidateQueries({ queryKey, exact: true })
    },
  })

  registry.set(hash, { refCount: 1, unsubscribe, first })

  return { first, release: () => release(hash) }
}

function release(hash: string) {
  const entry = registry.get(hash)
  if (!entry) return

  entry.refCount -= 1
  if (entry.refCount > 0) return

  entry.teardown = setTimeout(() => {
    entry.unsubscribe()
    registry.delete(hash)
  }, KEEP_ALIVE_MS)
}

/** Fecha todos os listeners. Usado no logout, para não vazar entre contas. */
export function releaseAllSubscriptions() {
  for (const entry of registry.values()) {
    clearTimeout(entry.teardown)
    entry.unsubscribe()
  }
  registry.clear()
}
