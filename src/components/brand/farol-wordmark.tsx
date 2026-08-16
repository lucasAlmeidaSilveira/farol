import { cn } from '@/lib/utils'

/**
 * O logotipo "farol".
 *
 * Em caixa baixa de propósito: caixa alta soaria institucional e autoritária, e
 * a marca é acolhedora e sem culpa. Minúsculas também dão altura de x maior, o
 * que ajuda na leitura em 14px na aba do navegador.
 *
 * A jogada da identidade: o `l` final JÁ é uma haste vertical. Basta pôr o
 * feixe âmbar no topo dela e o farol aparece dentro da própria palavra — a
 * marca funciona sem o símbolo ao lado.
 *
 * O feixe só entra acima de ~20px. Abaixo disso vira ruído, e o logotipo liso
 * lê melhor.
 */

/** Proporções do feixe, relativas ao tamanho da fonte. Ajustadas para a Inter. */
const BEAM = {
  width: 0.42,
  height: 0.13,
  /** Distância do topo da caixa em `em`, alinhando o feixe à ascendente do `l`. */
  top: 0.16,
  /** Respiro entre a haste do `l` e o começo do feixe. */
  gap: 0.05,
} as const

const MIN_SIZE_FOR_BEAM = 20

export type FarolWordmarkProps = {
  /** Tamanho da fonte em px. */
  size?: number
  /** Ver `FarolMark`: `theme` acompanha claro/escuro pelos tokens. */
  tone?: 'theme' | 'mono' | 'onDark' | 'onLight'
  className?: string
}

const TONE_CLASSES = {
  theme: {
    text: 'text-[var(--brand-tower)]',
    beam: 'bg-[var(--brand-beam)]',
  },
  mono: { text: 'text-current', beam: 'bg-current' },
  onDark: { text: 'text-[#E7F2EC]', beam: 'bg-[#F5C660]' },
  onLight: { text: 'text-[#0B2620]', beam: 'bg-[#6E4C05]' },
} as const

export function FarolWordmark({
  size = 22,
  tone = 'theme',
  className,
}: FarolWordmarkProps) {
  const showBeam = size >= MIN_SIZE_FOR_BEAM
  const colors = TONE_CLASSES[tone]

  return (
    <span
      className={cn(
        'inline-flex items-baseline leading-none font-semibold tracking-[-0.02em] select-none',
        colors.text,
        className,
      )}
      style={{ fontSize: size }}
    >
      faro
      <span className="relative inline-block">
        l
        {showBeam ? (
          <span
            aria-hidden
            className={cn('absolute rounded-full', colors.beam)}
            style={{
              width: `${BEAM.width}em`,
              height: `${BEAM.height}em`,
              top: `${BEAM.top}em`,
              left: `calc(100% + ${BEAM.gap}em)`,
            }}
          />
        ) : null}
      </span>
    </span>
  )
}
