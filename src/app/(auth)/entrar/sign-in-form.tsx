'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { FarolLockup } from '@/components/brand/farol-lockup'
import { Button } from '@/components/ui/button'
import { activeProviders, type ProviderId } from '@/data/auth-providers'
import { errorMessage, LoginCancelled, signInWith } from '@/data/session'
import { useSession } from '@/providers/auth-provider'

export function SignInForm() {
  const router = useRouter()
  const { user, loading } = useSession()
  const [busy, setBusy] = useState<ProviderId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [loading, user, router])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  async function handleSignIn(id: ProviderId) {
    setBusy(id)
    setError(null)

    try {
      await signInWith(id)
    } catch (caught) {
      // Fechar o popup é desistência, não erro. Nada de toast vermelho.
      if (!(caught instanceof LoginCancelled)) setError(errorMessage(caught))
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-10 px-6 py-10">
      <div className="flex flex-col items-center gap-6 text-center">
        <FarolLockup size={44} orientation="stacked" />
        <p className="text-muted-foreground text-balance">
          Descubra quanto você pode gastar este mês — sem planilha e sem
          complicação.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {activeProviders().map((provider) => (
          <Button
            key={provider.id}
            size="block"
            disabled={busy !== null || !online}
            onClick={() => void handleSignIn(provider.id)}
          >
            {busy === provider.id ? 'Abrindo…' : provider.label}
          </Button>
        ))}

        {error ? (
          <p
            role="alert"
            className="text-negative-soft-foreground bg-negative-soft rounded-md px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}

        {/*
          Login é a ÚNICA ação que realmente não funciona offline — todo o resto
          do app funciona. Dizer isso é melhor do que deixar o botão falhar com
          um erro genérico de rede.
        */}
        {!online ? (
          <p className="text-muted-foreground text-center text-sm">
            Você está offline. Para entrar pela primeira vez é preciso conexão.
          </p>
        ) : null}
      </div>

      <p className="text-muted-foreground text-center text-xs text-balance">
        Seus dados ficam só com você. O Farol não compartilha nada com ninguém.
      </p>
    </main>
  )
}
