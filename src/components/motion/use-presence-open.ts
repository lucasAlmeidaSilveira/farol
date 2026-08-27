'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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

  /*
    QUEM TINHA O FOCO ANTES DA CAMADA ABRIR.

    O Radix devolve o foco para o gatilho DELE (`triggerRef`) ao fechar. O Farol
    abre toda camada por código — o botão flutuante, a linha do plano, o
    lançamento que vira impacto —, então esse gatilho nunca existe, o
    `triggerRef` é nulo e o foco cai no `<body>`. Quem navega por teclado
    fechava um sheet e voltava para o topo do documento, tendo que percorrer a
    tela inteira de novo. Na interação mais usada do app.

    São duas referências, e a separação é o que faz funcionar: `lastFocusedRef`
    acompanha o foco enquanto a camada está fechada, e `originRef` CONGELA esse
    valor no instante da abertura. Guardar direto em `originRef` não serve — ao
    fechar, o efeito rodaria de novo e sobrescreveria a origem com um elemento
    de dentro da camada que está saindo.
  */
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  const originRef = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(isOpen)

  useEffect(() => {
    if (isOpen) {
      if (!wasOpen.current) originRef.current = lastFocusedRef.current
      wasOpen.current = true
      return
    }

    wasOpen.current = false

    const track = () => {
      const target = document.activeElement
      if (target instanceof HTMLElement && target !== document.body) {
        lastFocusedRef.current = target
      }
    }

    track()
    document.addEventListener('focusin', track)
    return () => document.removeEventListener('focusin', track)
  }, [isOpen])

  /*
    DEVOLVER O FOCO, insistindo até o elemento aceitar.

    A ordem aqui não é estável e não vale fingir que é: enquanto o nó da camada
    existe — e com `forceMount` ele sobrevive à animação de saída —, a armadilha
    de foco do Radix recusa qualquer `focus()` vindo de fora. Medido: a chamada
    não mudava o `activeElement`, nem no `onCloseAutoFocus`, nem no
    `onExitComplete`, nem um quadro depois de nenhum dos dois.

    Em vez de adivinhar o instante, attempt a cada quadro até funcionar, com teto
    de meio segundo — pouco mais que a animação de saída. Assim que o foco
    assenta no destino, o laço para.
  */
  useEffect(() => {
    if (isOpen) return

    const target = originRef.current
    if (!target?.isConnected) return

    let cancelled = false
    let attempts = 0

    const attempt = () => {
      if (cancelled || attempts > 40) return
      attempts += 1
      if (document.activeElement === target) return

      target.focus({ preventScroll: true })
      if (document.activeElement !== target) requestAnimationFrame(attempt)
    }

    requestAnimationFrame(attempt)
    return () => {
      cancelled = true
    }
  }, [isOpen])

  return { isOpen, onOpenChange: handleOpenChange }
}
