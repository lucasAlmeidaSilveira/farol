'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { BeaconSkeleton } from '@/components/ui/skeleton'
import { useSession } from '@/providers/auth-provider'

/**
 * Manda para o login quem não tem sessão.
 *
 * Isto é UX, NÃO segurança. Quem remover este guard no devtools vê um shell
 * vazio, porque quem recusa os dados é o Firestore, do lado do servidor do
 * Google, com base nas Security Rules. A segurança está no lugar certo.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/entrar')
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 py-6 sm:px-6">
        <BeaconSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-5 py-10 text-center sm:px-6">
        <h1 className="text-lg font-semibold">Não consegui abrir seu espaço</h1>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    )
  }

  return <>{children}</>
}
