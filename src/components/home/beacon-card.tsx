import { MoneyValue } from '@/components/money/money-value'
import type { Cents } from '@/domain/money'
import { formatDays, spokenBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

import { AllocationBar, type Slice } from './allocation-bar'

/**
 * O card do número principal. É a razão de o app existir.
 *
 * A superfície é azul-noite nos DOIS temas — o farol brilha no escuro, e o
 * número que guia nunca fica num card claro.
 *
 * Quando a folga fica negativa, a mudança não é só de cor: o feixe do farol
 * apaga, o rótulo muda de "livre para gastar" para "você passou do plano", e o
 * valor aparece em coral. Cor, forma e texto dizem a mesma coisa, para que a
 * informação sobreviva a qualquer daltonismo e ao teste em escala de cinza.
 */

export type BeaconState = 'lit' | 'dim' | 'out'

export type BeaconCardProps = {
  /** Livre para gastar até o fim do ciclo. Pode ser negativo. */
  remainingCents: Cents
  /** `null` quando o ciclo já acabou — a UI omite a linha em vez de mostrar 0. */
  dailyPaceCents: Cents | null
  remainingDays: number
  slices: readonly Slice[]
  state: BeaconState
  className?: string
}

export function BeaconCard({
  remainingCents,
  dailyPaceCents,
  remainingDays,
  slices,
  state,
  className,
}: BeaconCardProps) {
  const isOut = state === 'out'

  return (
    <section
      className={cn(
        'bg-beacon relative overflow-hidden rounded-2xl px-5 py-6',
        'shadow-lg sm:px-6 sm:py-7',
        !isOut && 'shadow-beam',
        className,
      )}
    >
      {/* O feixe: um halo âmbar difuso vindo do canto superior esquerdo.
          Apaga junto com o farol quando a pessoa passou do plano. */}
      {!isOut ? (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -top-16 -left-10 size-56 rounded-full blur-3xl',
            state === 'lit' ? 'bg-light-dim/20' : 'bg-light-dim/10',
          )}
        />
      ) : null}

      <div className="relative flex flex-col gap-5">
        <header className="flex items-center gap-2">
          <BeamGlyph lit={!isOut} />
          <h2 className="text-beacon-muted text-eyebrow uppercase">
            {isOut ? 'Você passou do plano' : 'Livre para gastar'}
          </h2>
        </header>

        <div className="flex flex-col gap-2">
          <MoneyValue
            cents={remainingCents}
            size="hero"
            tone={isOut ? 'default' : 'light'}
            sign="never"
            className={cn(isOut && 'text-light-out')}
            srLabel={
              isOut
                ? `Você passou do plano em ${spokenBRL(remainingCents)}`
                : `Livre para gastar: ${spokenBRL(remainingCents)}`
            }
          />

          {dailyPaceCents !== null && !isOut ? (
            <p className="text-beacon-muted flex flex-wrap items-center gap-x-2 text-sm">
              <span className="money">
                <MoneyValue
                  cents={dailyPaceCents}
                  size="sm"
                  tone="beacon"
                  hideCentsWhenZero
                />
                <span aria-hidden="true">/dia</span>
                <span className="sr-only"> por dia</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>faltam {formatDays(remainingDays)}</span>
            </p>
          ) : null}

          {isOut ? (
            <p className="text-light-out/90 text-sm">
              Ainda dá para reequilibrar. Veja o que dá para adiar no plano.
            </p>
          ) : null}
        </div>

        <AllocationBar slices={slices} />
      </div>
    </section>
  )
}

/** O símbolo do farol reduzido a torre + feixe, no tamanho de um rótulo. */
function BeamGlyph({ lit }: { lit: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="3"
        y="2"
        width="3"
        height="12"
        rx="0.5"
        className="fill-beacon-foreground"
      />
      <rect
        x="7"
        y="4"
        width="6"
        height="3"
        rx="1.5"
        className={lit ? 'fill-light' : 'fill-beacon-track'}
      />
    </svg>
  )
}
