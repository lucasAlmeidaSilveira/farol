'use client'

import { type Cents, cents, formatBRL } from '@/domain/money'
import { cn } from '@/lib/utils'

/**
 * Teclado numérico próprio, e não o do sistema operacional.
 *
 * Três razões concretas, todas de mobile:
 *
 * 1. No iOS, abrir o teclado nativo empurra a viewport e o botão Salvar sai da
 *    tela — o gesto mais comum do app viraria uma caçada por scroll.
 * 2. Com teclado próprio, os dígitos entram da direita para a esquerda em
 *    centavos. Digitar "1", "2", "3", "4" vira R$ 12,34 sem a pessoa precisar
 *    pensar em vírgula.
 * 3. Nunca existe estado inválido: não dá para digitar letra, nem duas
 *    vírgulas, nem três casas decimais. O `parseBRL` continua existindo para o
 *    fallback de desktop.
 */

const KEYS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '',
  '0',
  '⌫',
] as const

export type AmountKeypadProps = {
  value: Cents
  onChange: (value: Cents) => void
  /** Teto de sanidade, para um toque repetido não gerar um valor absurdo. */
  maxCents?: number
}

export function AmountKeypad({
  value,
  onChange,
  maxCents = 1_000_000_000,
}: AmountKeypadProps) {
  function press(key: string) {
    if (key === '') return

    if (key === '⌫') {
      onChange(cents(Math.floor(value / 10)))
      return
    }

    const next = value * 10 + Number(key)
    if (next > maxCents) return
    onChange(cents(next))
  }

  return (
    <div className="flex flex-col gap-5">
      <output
        aria-live="polite"
        className={cn(
          'money block text-center text-[2.75rem] leading-none font-bold tracking-[-0.02em]',
          value === 0 && 'text-muted-foreground',
        )}
      >
        {formatBRL(value)}
      </output>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key, index) =>
          key === '' ? (
            <div key={`gap-${index}`} />
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              aria-label={key === '⌫' ? 'Apagar último dígito' : key}
              className={cn(
                'flex h-14 items-center justify-center rounded-lg text-xl font-medium',
                'hover:bg-muted active:bg-muted transition-colors',
                key === '⌫' && 'text-muted-foreground',
              )}
            >
              {key}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
