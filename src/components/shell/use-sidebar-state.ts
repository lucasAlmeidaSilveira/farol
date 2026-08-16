'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * O estado recolhido da barra lateral, persistido.
 *
 * Persistir é o ponto: quem recolheu a barra fez uma escolha sobre o próprio
 * espaço de tela, e ela reabrir sozinha a cada navegação transformaria a opção
 * em irritação.
 *
 * O valor é lido de forma síncrona no primeiro render, dentro do inicializador
 * do `useState`, para a barra não "piscar" aberta antes de recolher. Como o
 * servidor não tem `localStorage`, o SSR sempre renderiza expandido e a
 * correção acontece na hidratação — por isso a transição de largura só liga
 * depois que a primeira pintura passou.
 */

const STORAGE_KEY = 'farol:sidebar-collapsed'

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  })

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  /*
    Atalho de teclado, convenção consolidada em editores e ferramentas de
    trabalho. Só dispara fora de campos de texto: em `[` dentro de um input a
    pessoa está escrevendo, não navegando.
  */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '[' || !(event.metaKey || event.ctrlKey)) return

      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true

      if (typing) return

      event.preventDefault()
      toggle()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle])

  return { collapsed, toggle }
}
