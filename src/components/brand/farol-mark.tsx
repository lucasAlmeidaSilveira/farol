import { cn } from '@/lib/utils'

/**
 * O símbolo do Farol: um "F" que é um farol.
 *
 * Haste vertical = torre. Dois braços horizontais = feixes de luz. Como têm
 * comprimentos diferentes, também leem como barras de um gráfico. Três leituras
 * numa forma só — letra, farol e finanças — e é essa densidade que faz o
 * símbolo aguentar 16px e ainda significar alguma coisa.
 *
 * CORES VÊM DOS TOKENS, não de hexadecimais fixos. Com cor fixa o símbolo
 * sumia no tema escuro, e os tokens de marca (`--brand-*`) já são verificados
 * contra o fundo de cada tema pelo `pnpm palette`.
 *
 * Decisões de forma que não são estéticas:
 *
 * - A torre é um trapézio de base mais larga. Lados paralelos leriam como um
 *   traço; o afunilamento lê como arquitetura, e arquitetura passa firmeza.
 * - Os feixes são horizontais, não inclinados. Inclinados só leriam como luz;
 *   horizontais leem como luz E como "F" E como barra de gráfico — e sobrevivem
 *   a 16px, onde qualquer diagonal vira serrilhado.
 * - A razão entre os feixes é 1,6:1 e é FIXA. A assimetria evita a estática de
 *   um sinal de igual e evoca os dois números do app: o que entra e o que sobra.
 * - Há um vão de 2 unidades entre a torre e os feixes. A luz SAI da torre, não
 *   é parte dela; sem o vão, o F vira um monolito pesado.
 */

export type FarolMarkProps = {
  /** Lado do símbolo em px. */
  size?: number
  /**
   * `theme` (padrão) acompanha claro/escuro pelos tokens.
   * `mono` herda `currentColor` — para contextos de cor única.
   * `onDark` e `onLight` fixam o esquema, para superfícies que não seguem o
   * tema (o card do número principal, imagens de compartilhamento).
   */
  tone?: 'theme' | 'mono' | 'onDark' | 'onLight'
  /** Inclui a linha do horizonte. Só faz sentido acima de ~32px. */
  withHorizon?: boolean
  /**
   * Feixe apagado. EXCLUSIVO para ilustrações de estado (erro, vazio, folga
   * negativa). Nunca use o farol apagado como logo.
   */
  lit?: boolean
  /** Vira o `<title>` do SVG. Sem ele, o símbolo é decorativo (`aria-hidden`). */
  title?: string
  className?: string
}

const TONE_CLASSES = {
  theme: {
    tower: 'fill-[var(--brand-tower)]',
    beam: 'fill-[var(--brand-beam)]',
    beamSoft: 'fill-[var(--brand-beam-soft)]',
    unlit: 'fill-[var(--brand-unlit)]',
    horizon: 'fill-[var(--brand-unlit)]',
  },
  mono: {
    tower: 'fill-current',
    beam: 'fill-current',
    beamSoft: 'fill-current opacity-55',
    unlit: 'fill-current opacity-40',
    horizon: 'fill-current opacity-40',
  },
  onDark: {
    tower: 'fill-[#E7F2EC]',
    beam: 'fill-[#F5C660]',
    beamSoft: 'fill-[#F7D183]',
    unlit: 'fill-[#5E8577]',
    horizon: 'fill-[#2C5A48]',
  },
  onLight: {
    tower: 'fill-[#0B2620]',
    beam: 'fill-[#6E4C05]',
    beamSoft: 'fill-[#8A5F0A]',
    unlit: 'fill-[#4F6E64]',
    horizon: 'fill-[#9FBCB0]',
  },
} as const

export function FarolMark({
  size = 24,
  tone = 'theme',
  withHorizon = false,
  lit = true,
  title,
  className,
}: FarolMarkProps) {
  const colors = TONE_CLASSES[tone]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      className={cn('shrink-0', className)}
    >
      {title ? <title>{title}</title> : null}

      {/* Torre: trapézio com cantos inferiores arredondados. */}
      <path
        d="M5.5 3H9L10 20Q10 21 9 21H5.5Q4.5 21 4.5 20Z"
        className={colors.tower}
      />

      {/* Feixe maior: ponta direita totalmente arredondada — a luz se dissolve,
          não termina em bloco. */}
      <path
        d="M11.5 5H19.5A1.5 1.5 0 0 1 19.5 8H11.5A0.5 0.5 0 0 1 11 7.5V5.5A0.5 0.5 0 0 1 11.5 5Z"
        className={lit ? colors.beam : colors.unlit}
      />

      {/* Feixe menor: tom mais claro, nunca opacidade — transparência quebra
          sobre fundos coloridos. */}
      <path
        d="M11.5 10.5H16A1.25 1.25 0 0 1 16 13H11.5A0.5 0.5 0 0 1 11 12.5V11A0.5 0.5 0 0 1 11.5 10.5Z"
        className={lit ? colors.beamSoft : colors.unlit}
      />

      {withHorizon ? (
        <rect
          x="2"
          y="21"
          width="20"
          height="1.5"
          rx="0.75"
          className={colors.horizon}
        />
      ) : null}
    </svg>
  )
}
