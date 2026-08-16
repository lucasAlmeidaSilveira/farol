'use client'

import { CloudOff } from 'lucide-react'

import { useOnlineStatus } from '@/hooks/use-online-status'

/**
 * A barra de offline — deliberadamente discreta.
 *
 * Offline é estado NORMAL neste app, não erro: o Firestore grava local e
 * sincroniza sozinho ao reconectar. Um modal ou um toast vermelho trataria
 * como falha algo que está funcionando, e ensinaria o usuário a desconfiar do
 * número justamente quando ele continua correto.
 *
 * Por isso: uma faixa fina, texto que explica o que continua valendo, e nenhum
 * botão desabilitado em lugar nenhum do app.
 */
export function OfflineBar() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div
      role="status"
      className="bg-secondary text-secondary-foreground flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium"
    >
      <CloudOff aria-hidden className="size-3.5 shrink-0" />
      <span className="text-balance">
        Sem conexão. Você pode continuar lançando — sincroniza sozinho depois.
      </span>
    </div>
  )
}
