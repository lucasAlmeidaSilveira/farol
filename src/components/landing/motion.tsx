'use client'

import { m, useScroll, useSpring } from 'motion/react'

import { EASE } from '@/components/motion/transitions'
import { cn } from '@/lib/utils'

/**
 * As duas peças de movimento que só existem na página pública.
 *
 * O resto — entrada, cascata, camadas — vem de `components/motion/`, o mesmo
 * que o app usa. Aqui ficam apenas as que não fazem sentido dentro do produto:
 * uma régua de rolagem (o app não tem página longa) e uma linha que se desenha
 * entre passos (o app não explica a si mesmo).
 */

/**
 * A linha que se desenha entre os passos.
 *
 * O gesto É a informação: ela mostra que os três passos são uma sequência, e
 * não três coisas soltas lado a lado.
 */
export function DrawLine({
  className,
  delay = 0,
}: {
  className?: string
  delay?: number
}) {
  return (
    <m.div
      aria-hidden="true"
      data-reveal=""
      className={cn('origin-left', className)}
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    />
  )
}

/**
 * O fio no topo, que acompanha a rolagem.
 *
 * É a única peça da página que responde ao dedo em tempo real, e é isso que
 * separa a sensação de instrumento da de folheto. Também tem função: numa
 * página longa, saber quanto falta é o que impede a desistência no meio.
 *
 * A mola existe porque a rolagem em trackpad e em celular chega em saltos —
 * ligada direto, a barra treme. Amortecida, ela desliza.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    restDelta: 0.001,
  })

  return (
    <m.div
      aria-hidden="true"
      style={{
        scaleX,
        background: 'linear-gradient(90deg, var(--primary), var(--brand-beam))',
      }}
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5 origin-left"
    />
  )
}
