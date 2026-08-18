'use client'

import {
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  useScroll,
  useSpring,
} from 'motion/react'

import { cn } from '@/lib/utils'

/**
 * A camada de movimento da landing, sobre o Motion (ex-Framer Motion).
 *
 * Por que uma biblioteca aqui e não no app: são problemas diferentes. Dentro do
 * Farol, movimento é curto e reativo — 150ms de resposta a um toque, 250ms de
 * entrada de card —, e CSS resolve isso sem custo nenhum. Nesta página o
 * movimento precisa saber ONDE a pessoa está na rolagem, encadear entradas com
 * mola e nunca deixar conteúdo invisível se algo falhar. Isso em CSS puro
 * depende de `animation-timeline`, que ainda não existe em toda parte.
 *
 * Três decisões que valem a leitura:
 *
 * 1. **`LazyMotion` com `domAnimation` e `strict`.** Carrega só o subconjunto de
 *    animação e gestos (~17kb) em vez do pacote inteiro, e o `strict` REPROVA em
 *    desenvolvimento quem importar o `motion` completo por engano — a forma mais
 *    barata de o bundle não crescer sozinho com o tempo.
 * 2. **`reducedMotion="user"`.** Quem pediu menos movimento no sistema recebe o
 *    conteúdo direto, sem deslocamento. Não é cortesia: para parte das pessoas,
 *    animação de tela causa enjoo de verdade.
 * 3. **Os laços de ambiente continuam em CSS** — o feixe girando, o halo que
 *    respira, a varredura de luz. São infinitos, e mantê-los fora do JavaScript
 *    significa que rolar a página não disputa quadro com eles.
 *
 * ATENÇÃO ao preço que vem junto: o Motion renderiza o estado inicial já no
 * servidor, então o HTML sai com `opacity: 0`. Sem JavaScript, a página ficaria
 * em branco — inaceitável numa página cujo trabalho é convencer. Por isso todo
 * elemento animado carrega `data-reveal`, e o `<noscript>` do layout público
 * devolve todos eles ao estado final numa regra de CSS. É a única linha de
 * defesa que funciona sem depender do próprio JavaScript que falhou.
 */
export function LandingMotion({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

/** A curva da casa: sai rápido, chega devagar. A mesma do `globals.css`. */
const EASE = [0.22, 1, 0.36, 1] as const

/**
 * Entrada ao chegar na tela.
 *
 * O desfoque que abre junto é o detalhe que faz a diferença: sem ele o
 * elemento "aparece"; com ele, ele ENTRA EM FOCO — que é exatamente a
 * promessa da página. Distância curta (18px) porque o exagero aqui lê como
 * carrossel de site de agência.
 *
 * `once` é obrigatório: repetir a animação a cada rolagem para cima transforma
 * a leitura em enjoo e denuncia o truque.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  x = 0,
  y = 18,
  onMount = false,
}: {
  children: React.ReactNode
  className?: string
  /** Segundos. Use o índice do item para escalonar uma grade. */
  delay?: number
  /** Deslocamento lateral, para a peça entrar do lado em que ela está. */
  x?: number
  y?: number
  /**
   * Anima ao montar, sem esperar a rolagem. Use ACIMA DA DOBRA.
   *
   * O que está visível no primeiro quadro não pode depender de um
   * `IntersectionObserver`: se ele demorar — aba em segundo plano, dispositivo
   * lento, robô que renderiza com pressa —, a primeira tela fica vazia, e a
   * primeira tela vazia é a única que não tem segunda chance.
   */
  onMount?: boolean
}) {
  const visible = { opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }

  return (
    <m.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, x, y, filter: 'blur(6px)' }}
      animate={onMount ? visible : undefined}
      whileInView={onMount ? undefined : visible}
      viewport={onMount ? undefined : { once: true, amount: 0.2 }}
      transition={{ duration: 0.65, ease: EASE, delay }}
    >
      {children}
    </m.div>
  )
}

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
