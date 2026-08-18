/**
 * O vocabulário de movimento do Farol, num lugar só.
 *
 * Existe para que "quanto tempo dura" não vire uma decisão tomada de novo a
 * cada componente. As durações não são gosto: são a régua do projeto.
 *
 * - **REAÇÃO (150ms)** — resposta a um toque. Acima disso a interface parece
 *   lenta; abaixo, o movimento não é percebido e vira piscada.
 * - **ENTRADA (250ms)** — elemento novo aparecendo. Diz "isto é novo" sem
 *   atrasar quem está tentando fazer alguma coisa.
 * - **CAMADA (300ms)** — sheet, diálogo, popover. Um pouco mais longo porque a
 *   superfície é grande e o olho precisa acompanhar de onde ela veio.
 * - **REVELAÇÃO (650ms)** — só nas vitrines (landing e entrada), onde ninguém
 *   tem tarefa pendente e o movimento carrega a marca.
 * - **CONTAGEM (600ms)** — exclusiva do impacto de renda, o único lugar em que
 *   a animação É a informação: o número correndo mostra o quanto mudou.
 *
 * A curva é sempre a mesma: sai rápido, chega devagar. Movimento que desacelera
 * no fim lê como objeto real assentando; linear lê como máquina.
 */

export const EASE = [0.22, 1, 0.36, 1] as const

export const DURATION = {
  reaction: 0.15,
  enter: 0.25,
  layer: 0.3,
  reveal: 0.65,
  count: 0.6,
} as const

/** Entrada padrão de elemento dentro do app. */
export const ENTER = { duration: DURATION.enter, ease: EASE }

/** Superfícies que cobrem a tela: sheet, diálogo, popover. */
export const LAYER = { duration: DURATION.layer, ease: EASE }

/** Saída é sempre mais curta que a entrada: quem fechou já decidiu, e esperar
 *  a animação de despedida é a forma mais barata de irritar. */
export const LAYER_EXIT = { duration: DURATION.reaction * 1.4, ease: EASE }
