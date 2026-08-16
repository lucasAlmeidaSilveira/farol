import { cva, type VariantProps } from 'class-variance-authority'

import type { Cents } from '@/domain/money'
import { formatAbsoluteBRL, signPrefix, spokenBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * O ÚNICO lugar do app que renderiza dinheiro.
 *
 * Ninguém escreve "R$" na mão. Isso garante três coisas de uma vez:
 *
 * 1. `tabular-nums` em todo número — sem isso o dígito 1 é mais estreito e a
 *    coluna "dança" quando o valor atualiza em tempo real, que é o oposto do
 *    que um número confiável parece.
 * 2. O sinal de menos é sempre U+2212, nunca hífen: ele tem a largura do dígito
 *    tabular e mantém o alinhamento da coluna.
 * 3. O leitor de tela recebe uma leitura escrita para ser ouvida, e não os
 *    separadores e símbolos da versão visual.
 */

const moneyValue = cva('money inline-block', {
  variants: {
    size: {
      hero: 'text-[3.5rem] leading-none font-bold tracking-[-0.03em] sm:text-[4.25rem]',
      xl: 'text-[2rem] leading-tight font-bold tracking-[-0.02em]',
      lg: 'text-[1.375rem] leading-snug font-semibold',
      md: 'text-base leading-normal font-medium',
      sm: 'text-sm leading-snug font-medium',
    },
    tone: {
      default: 'text-foreground',
      positive: 'text-positive',
      negative: 'text-negative',
      muted: 'text-muted-foreground',
      beacon: 'text-beacon-foreground',
      light: 'text-light',
      covenant: 'text-covenant',
    },
  },
  defaultVariants: { size: 'md', tone: 'default' },
})

export type MoneyValueProps = VariantProps<typeof moneyValue> & {
  cents: Cents
  /**
   * `auto` mostra o menos só em negativos · `always` força + ou − ·
   * `never` mostra o valor absoluto.
   */
  sign?: 'auto' | 'always' | 'never'
  /** Esconde ",00" — reduz ruído no número principal. */
  hideCentsWhenZero?: boolean
  /** Sobrescreve a leitura do leitor de tela. */
  srLabel?: string
  className?: string
}

export function MoneyValue({
  cents,
  sign = 'auto',
  size,
  tone,
  hideCentsWhenZero = false,
  srLabel,
  className,
}: MoneyValueProps) {
  const prefix = signPrefix(cents, sign)
  const formatted = formatAbsoluteBRL(cents, { hideCentsWhenZero })

  return (
    <data
      value={cents / 100}
      className={cn(moneyValue({ size, tone }), className)}
    >
      <span aria-hidden="true">
        {prefix}
        {formatted}
      </span>
      <span className="sr-only">{srLabel ?? spokenBRL(cents)}</span>
    </data>
  )
}
