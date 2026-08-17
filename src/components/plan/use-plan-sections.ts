'use client'

import { useCallback, useState } from 'react'

/**
 * Quais seções do plano estão abertas, persistido.
 *
 * Mesma razão da barra lateral: abrir e fechar é uma escolha sobre o próprio
 * espaço de tela, e refazê-la a cada visita transforma a opção em irritação.
 *
 * O padrão é TUDO FECHADO — e isso não esconde informação, promove. Com o
 * subtotal no cabeçalho, a tela fechada mostra a equação inteira de uma vez:
 * entra, sai antes, contas, parcelas. É mais do que a versão aberta conseguia
 * mostrar sem rolar três telas.
 */

const STORAGE_KEY = 'farol:plan-open-sections'

export function usePlanSections() {
  /*
    Lido de forma síncrona no primeiro render, para as seções não piscarem
    abertas antes de fechar. No servidor não há `localStorage`, então o SSR
    sempre renderiza fechado e a hidratação corrige.
  */
  const [open, setOpen] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed: unknown = raw === null ? null : JSON.parse(raw)
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : []
    } catch {
      // Valor corrompido não pode derrubar a tela: começa fechado e segue.
      return []
    }
  })

  const change = useCallback((next: string[]) => {
    setOpen(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  return { open, change }
}
