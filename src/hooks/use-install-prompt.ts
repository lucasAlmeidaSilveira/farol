'use client'

import { useCallback, useEffect, useState } from 'react'

import { countSession, isEngaged } from '@/lib/engagement'

/**
 * O convite de instalar o Farol na tela inicial.
 *
 * O navegador dispara `beforeinstallprompt` quando ELE julga o site
 * instalável, e esse evento é a única chance de abrir o diálogo nativo: se não
 * for guardado, ele se perde. Guardar não é o mesmo que usar — o Farol segura
 * o evento e só oferece o convite a quem já voltou e já lançou algo (ver
 * `lib/engagement`).
 *
 * Recusar encerra o assunto: o navegador não reabre o diálogo com o mesmo
 * evento, e insistir com banner próprio seria só ruído.
 */

const DISMISSED = 'farol:install-dismissed'

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function dismissedBefore(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED) !== null
  } catch {
    // Safari em navegação privada lança ao tocar em storage. Sem memória do
    // "agora não", mas sem quebrar a tela por causa de um banner opcional.
    return false
  }
}

export function useInstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null)

  /*
    Inicializador lazy, não efeito: a elegibilidade é lida uma única vez, e ler
    por efeito produziria um render intermediário com valor errado — além de
    cair na regra de set-state-in-effect do React 19.

    `countSession()` é efeito colateral em render, o que normalmente se evita,
    mas aqui é seguro por construção: ele é idempotente dentro da sessão
    (guardado por `sessionStorage`), então a dupla invocação do StrictMode não
    infla a contagem.
  */
  const [eligible] = useState(() => {
    if (typeof window === 'undefined') return false
    countSession()
    return isEngaged() && !dismissedBefore()
  })

  useEffect(() => {
    if (!eligible) return

    function capture(nativeEvent: Event) {
      // Sem isto o Chrome mostra a própria barra, e o convite apareceria cedo
      // demais — exatamente o que este hook existe para evitar.
      nativeEvent.preventDefault()
      setEvent(nativeEvent as InstallEvent)
    }

    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [eligible])

  const install = useCallback(async () => {
    if (!event) return
    await event.prompt()
    await event.userChoice
    // Aceito ou recusado, o evento morreu: não dá para promptar de novo.
    setEvent(null)
  }, [event])

  const dismiss = useCallback(() => {
    setEvent(null)
    try {
      window.localStorage.setItem(DISMISSED, '1')
    } catch {
      /* idem */
    }
  }, [])

  return { canInstall: event !== null, install, dismiss }
}
