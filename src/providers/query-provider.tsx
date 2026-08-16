'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * O QueryClient nasce dentro do `useState` para que cada montagem tenha o seu.
 * Um client em escopo de módulo vazaria cache entre requisições no servidor.
 *
 * Os defaults são pensados para o Firestore: o socket é a fonte de frescor, e
 * cada refetch desnecessário é leitura paga. Ver `use-firestore-query.ts`.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Number.POSITIVE_INFINITY,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
          },
          mutations: {
            // Escrita offline não é falha: o Firestore enfileira e sincroniza
            // sozinho. Retentar aqui duplicaria lançamentos.
            retry: 0,
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
