import { cn } from '@/lib/utils'

import { FarolMark } from './farol-mark'
import { FarolWordmark } from './farol-wordmark'

/**
 * Símbolo + logotipo.
 *
 * O gap é proporcional ao símbolo (0,5x no horizontal, 0,35x no empilhado) para
 * que o conjunto mantenha o mesmo ritmo em qualquer tamanho. A área de proteção
 * ao redor é de 1x a largura da haste da torre.
 */

export type FarolLockupProps = {
  /** Altura do símbolo em px. O logotipo acompanha. */
  size?: number
  orientation?: 'horizontal' | 'stacked'
  tone?: 'theme' | 'mono' | 'onDark' | 'onLight'
  className?: string
}

export function FarolLockup({
  size = 32,
  orientation = 'horizontal',
  tone = 'theme',
  className,
}: FarolLockupProps) {
  const horizontal = orientation === 'horizontal'

  return (
    <span
      className={cn(
        'inline-flex',
        horizontal ? 'flex-row items-center' : 'flex-col items-center',
        className,
      )}
      style={{ gap: size * (horizontal ? 0.5 : 0.35) }}
    >
      <FarolMark size={size} tone={tone} withHorizon={size >= 32} />
      <FarolWordmark size={size * 0.82} tone={tone} />
    </span>
  )
}
