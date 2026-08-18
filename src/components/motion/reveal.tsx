'use client'

import { m } from 'motion/react'

import { DURATION, EASE, ENTER } from './transitions'

/**
 * Entrada de elemento — a peça de movimento mais usada do app.
 *
 * O padrão é curto (250ms, 12px) porque dentro do produto a animação atrasa
 * alguém que está tentando fazer alguma coisa. Nas vitrines, `reveal` alonga
 * para 650ms e soma um desfoque que abre: ali ninguém tem tarefa pendente, e o
 * movimento carrega a marca.
 *
 * `onMount` anima assim que o componente monta; sem ele, a entrada espera o
 * elemento chegar à tela. Use `onMount` em tudo que está visível no primeiro
 * quadro — o que abre a tela não pode depender de um `IntersectionObserver`,
 * que pode demorar em aba de segundo plano ou aparelho lento.
 *
 * Todo elemento carrega `data-reveal`: o Motion escreve o estado inicial já no
 * HTML do servidor, e a regra do `<noscript>` no layout raiz devolve tudo ao
 * estado final se o JavaScript não carregar. Sem isso, JavaScript quebrado
 * seria tela em branco.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  x = 0,
  y = 12,
  onMount = false,
  variant = 'app',
}: {
  children: React.ReactNode
  className?: string
  /** Segundos. Use o índice do item para escalonar uma grade. */
  delay?: number
  /** Deslocamento lateral, para a peça entrar do lado em que ela já está. */
  x?: number
  y?: number
  /** Anima ao montar, sem esperar a rolagem. Obrigatório acima da dobra. */
  onMount?: boolean
  /** `reveal` é a versão longa, com desfoque, exclusiva de landing e entrada. */
  variant?: 'app' | 'reveal'
}) {
  const showcase = variant === 'reveal'
  const blur = showcase ? 'blur(6px)' : 'blur(0px)'
  const visible = { opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }

  return (
    <m.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, x, y, filter: blur }}
      animate={onMount ? visible : undefined}
      whileInView={onMount ? undefined : visible}
      viewport={onMount ? undefined : { once: true, amount: 0.2 }}
      transition={{
        duration: showcase ? DURATION.reveal : DURATION.enter,
        ease: EASE,
        delay,
      }}
    >
      {children}
    </m.div>
  )
}

/**
 * Cascata: cada filho entra um pouco depois do anterior.
 *
 * O passo de 40ms é o do app — o suficiente para o olho perceber ordem, curto
 * o bastante para a lista inteira estar pronta antes de alguém tentar tocar
 * nela. Nas vitrines o passo é maior, porque lá a cascata é apresentação.
 *
 * Orquestrado por variantes, e não por `delay` calculado: assim o atraso de um
 * item não depende de o pai saber o índice dele, e uma lista que muda de
 * tamanho continua com o mesmo ritmo.
 */
export function Stagger({
  children,
  className,
  step = 0.04,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  /** Segundos entre um filho e o próximo. */
  step?: number
  as?: 'div' | 'ul' | 'ol'
}) {
  const Comp = as === 'ul' ? m.ul : as === 'ol' ? m.ol : m.div

  return (
    <Comp
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: step,
            // O primeiro filho não espera: a tela responde no primeiro quadro.
            delayChildren: 0,
          },
        },
      }}
    >
      {children}
    </Comp>
  )
}

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: ENTER },
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'li' | 'section'
}) {
  const Comp = as === 'li' ? m.li : as === 'section' ? m.section : m.div

  return (
    <Comp data-reveal="" className={className} variants={ITEM_VARIANTS}>
      {children}
    </Comp>
  )
}
