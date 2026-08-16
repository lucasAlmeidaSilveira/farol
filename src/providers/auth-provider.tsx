'use client'

import { onAuthStateChanged, type User } from 'firebase/auth'
import { createContext, use, useEffect, useState } from 'react'

import { ensureUserAndSpace } from '@/data/ensure-space'
import { auth } from '@/data/firebase'
import { completeRedirect } from '@/data/session'
import type { SpaceId } from '@/domain/types'

/**
 * A sessão do Farol.
 *
 * Sessão 100% client-side, sem session cookie e sem Admin SDK. O gate REAL de
 * segurança são as Security Rules, que rodam no servidor do Google: quem
 * remover a proteção de rota no devtools vê um shell vazio, porque o Firestore
 * recusa os dados. Guardar rota no cliente é UX, não segurança.
 *
 * O caminho alternativo (session cookie + Admin SDK) traria duas fontes de
 * verdade de autorização — as rules para o cliente e código TypeScript para o
 * servidor — que divergem com o tempo. Num app cujo requisito é privacidade,
 * duplicar a superfície de autorização é o pior trade-off disponível.
 */

export type Session = {
  user: User | null
  spaceId: SpaceId | null
  /** `true` até o Firebase resolver se há sessão salva. Evita flash de login. */
  loading: boolean
  error: Error | null
}

const SessionContext = createContext<Session>({
  user: null,
  spaceId: null,
  loading: true,
  error: null,
})

export const useSession = () => use(SessionContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: null,
    spaceId: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Fecha o ciclo caso o login tenha caído no fallback de redirect.
    void completeRedirect().catch(() => {})

    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        setSession({ user, spaceId: null, loading: false, error: null })
        return
      }

      // O usuário já está autenticado: mostramos a sessão de imediato e
      // resolvemos o espaço em seguida, para não segurar a tela no bootstrap.
      setSession({ user, spaceId: null, loading: true, error: null })

      ensureUserAndSpace(user)
        .then((spaceId) =>
          setSession({ user, spaceId, loading: false, error: null }),
        )
        .catch((error: Error) =>
          setSession({ user, spaceId: null, loading: false, error }),
        )
    })
  }, [])

  return <SessionContext value={session}>{children}</SessionContext>
}
