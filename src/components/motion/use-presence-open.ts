'use client'

import { useCallback, useState } from 'react'

/**
 * O estado de abertura de uma superfície do Radix, sempre legível.
 *
 * As camadas do app (sheet, diálogo, popover, tooltip) precisam saber se estão
 * abertas para que o `AnimatePresence` anime a SAÍDA — e o Radix só entrega
 * isso a quem controla o estado. Este hook espelha o valor: quem passa `open`
 * continua no controle, quem não passa ganha um estado interno idêntico ao
 * comportamento padrão.
 *
 * Sem isto, cada primitivo repetiria as mesmas seis linhas, e a primeira cópia
 * a divergir seria uma camada que fecha sem animação em uma tela só.
 */
export function usePresenceOpen({
  open,
  defaultOpen,
  onOpenChange,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internal, setInternal] = useState(defaultOpen ?? false)
  const isOpen = open ?? internal

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setInternal(next)
      onOpenChange?.(next)
    },
    [onOpenChange],
  )

  return { isOpen, onOpenChange: handleOpenChange }
}
