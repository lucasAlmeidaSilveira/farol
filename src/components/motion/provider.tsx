'use client'

import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'

/**
 * A camada de movimento do app inteiro, sobre o Motion (ex-Framer Motion).
 *
 * Três decisões que seguram o custo dessa escolha:
 *
 * 1. **`LazyMotion` com `domAnimation`.** Carrega só o subconjunto de animação,
 *    gestos e saída (~17kb) em vez do pacote completo. Fora ficam `layout` e
 *    `drag`, que o app não usa — e que sozinhos dobrariam o tamanho.
 * 2. **`strict`.** Importar o `motion` completo em vez do `m` REPROVA em
 *    desenvolvimento. É o que impede o bundle de crescer sozinho daqui a seis
 *    meses, quando alguém copiar um exemplo da internet.
 * 3. **`reducedMotion="user"`.** Quem pediu menos movimento no sistema recebe o
 *    conteúdo direto, sem deslocamento. Não é cortesia: para parte das pessoas,
 *    animação de tela causa enjoo de verdade.
 *
 * O que NÃO passa por aqui, e o motivo: laço infinito de ambiente (o feixe do
 * farol, o halo, a varredura) e o pulso dos esqueletos continuam em CSS. São
 * animações que rodam para sempre, e mantê-las fora do JavaScript significa que
 * elas não disputam quadro com a rolagem nem com o carregamento.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
