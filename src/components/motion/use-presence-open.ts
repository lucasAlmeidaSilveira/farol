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

    São duas referências, e a separação é o que faz funcionar: `ultimoRef`
    acompanha o foco enquanto a camada está fechada, e `origemRef` CONGELA esse
    valor no instante da abertura. Guardar direto em `origemRef` não serve — ao
    fechar, o efeito rodaria de novo e sobrescreveria a origem com um elemento
    de dentro da camada que está saindo.
  */
  const ultimoRef = useRef<HTMLElement | null>(null)
  const origemRef = useRef<HTMLElement | null>(null)
  const estavaAberto = useRef(isOpen)

  useEffect(() => {
    if (isOpen) {
      if (!estavaAberto.current) origemRef.current = ultimoRef.current
      estavaAberto.current = true
      return
    }

    estavaAberto.current = false

    const anota = () => {
      const alvo = document.activeElement
      if (alvo instanceof HTMLElement && alvo !== document.body) {
        ultimoRef.current = alvo
      }
    }

    anota()
    document.addEventListener('focusin', anota)
    return () => document.removeEventListener('focusin', anota)
  }, [isOpen])

  /*
    DEVOLVER O FOCO, insistindo até o elemento aceitar.

    A ordem aqui não é estável e não vale fingir que é: enquanto o nó da camada
    existe — e com `forceMount` ele sobrevive à animação de saída —, a armadilha
    de foco do Radix recusa qualquer `focus()` vindo de fora. Medido: a chamada
    não mudava o `activeElement`, nem no `onCloseAutoFocus`, nem no
    `onExitComplete`, nem um quadro depois de nenhum dos dois.

    Em vez de adivinhar o instante, tenta a cada quadro até funcionar, com teto
    de meio segundo — pouco mais que a animação de saída. Assim que o foco
    assenta no destino, o laço para.
  */
  useEffect(() => {
    if (isOpen) return

    const alvo = origemRef.current
    if (!alvo?.isConnected) return

    let cancelado = false
    let tentativas = 0

    const tenta = () => {
      if (cancelado || tentativas > 40) return
      tentativas += 1
      if (document.activeElement === alvo) return

      alvo.focus({ preventScroll: true })
      if (document.activeElement !== alvo) requestAnimationFrame(tenta)
    }

    requestAnimationFrame(tenta)
    return () => {
      cancelado = true
    }
  }, [isOpen])

  return { isOpen, onOpenChange: handleOpenChange }
}
