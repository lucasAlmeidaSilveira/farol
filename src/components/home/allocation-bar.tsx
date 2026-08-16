import type { Cents } from '@/domain/money'
import { formatAbsoluteBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Para onde foi cada real que entrou no mês.
 *
 * O problema de acessibilidade aqui é real e não é óbvio: âmbar e verde-menta
 * têm luminâncias quase idênticas (razão 1.06 entre si). Quem não distingue
 * matiz não distingue as fatias. A separação vem de TRÊS camadas independentes:
 *
 * 1. Um gap de 2px na cor da superfície entre fatias, para que nenhuma encoste
 *    em outra — assim cada uma é medida contra o fundo, onde todas passam de
 *    5.44:1.
 * 2. Um padrão próprio por fatia (sólido, listrado, pontilhado).
 * 3. Uma forma diferente de marcador na legenda (losango, quadrado, círculo,
 *    círculo vazado).
 *
 * Qualquer uma das três, sozinha, já comunica.
 */

export type SliceId = 'covenant' | 'fixed' | 'goal' | 'spent' | 'free'

export type Slice = {
  id: SliceId
  label: string
  amountCents: Cents
}

const SLICE_STYLE: Record<
  SliceId,
  { fill: string; pattern: string; marker: string }
> = {
  covenant: {
    fill: 'bg-slice-covenant',
    pattern: '',
    marker: 'rotate-45 rounded-[1px]',
  },
  fixed: {
    fill: 'bg-slice-fixed',
    pattern: 'slice-stripe',
    marker: 'rounded-[1px]',
  },
  goal: { fill: 'bg-slice-goal', pattern: 'slice-dot', marker: 'rounded-full' },
  spent: {
    fill: 'bg-slice-spent',
    pattern: 'slice-stripe',
    marker: 'rounded-full',
  },
  free: {
    fill: 'bg-slice-free',
    pattern: '',
    marker: 'rounded-full border-2 bg-transparent',
  },
}

export type AllocationBarProps = {
  slices: readonly Slice[]
  showLegend?: boolean
  className?: string
}

export function AllocationBar({
  slices,
  showLegend = true,
  className,
}: AllocationBarProps) {
  const visible = slices.filter((slice) => slice.amountCents > 0)
  const total = visible.reduce<number>(
    (sum, slice) => sum + slice.amountCents,
    0,
  )

  if (total === 0) return null

  const description = visible
    .map(
      (slice) =>
        `${slice.label}: ${formatAbsoluteBRL(slice.amountCents)}, ${Math.round(
          (slice.amountCents / total) * 100,
        )} por cento`,
    )
    .join('. ')

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        role="img"
        aria-label={`Distribuição do mês. ${description}`}
        className="flex h-2.5 w-full gap-[2px] overflow-hidden"
      >
        {visible.map((slice) => {
          const style = SLICE_STYLE[slice.id]
          return (
            <div
              key={slice.id}
              className={cn('h-full rounded-full', style.fill, style.pattern)}
              style={{ flexGrow: slice.amountCents, flexBasis: 0 }}
            />
          )
        })}
      </div>

      {showLegend ? (
        <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1.5">
          {visible.map((slice) => {
            const style = SLICE_STYLE[slice.id]
            return (
              <li
                key={slice.id}
                className="text-beacon-muted flex items-center gap-1.5 text-xs"
              >
                <span
                  className={cn(
                    'size-2 shrink-0',
                    style.fill,
                    style.marker,
                    slice.id === 'free' && 'border-slice-free',
                  )}
                />
                {slice.label}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
