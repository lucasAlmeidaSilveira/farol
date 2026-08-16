import { MoneyValue } from '@/components/money/money-value'
import { type BasisPoints, type Cents, formatRate } from '@/domain/money'
import { formatAbsoluteBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * O card de um compromisso proporcional — a Comunhão de Bens é o caso central.
 *
 * A regra de produto aqui: a fórmula fica SEMPRE visível, em linguagem natural
 * ("15% de R$ 3.550 que entrou este mês"), e as parcelas somam exatamente o
 * total. Para quem não confia no próprio controle financeiro, ver a conta
 * aberta é o que transforma um número numa informação em que se acredita.
 */

export type CommitmentPartView = {
  id: string
  label: string
  rateBp: BasisPoints
  amountCents: Cents
}

export type CommitmentCardProps = {
  name: string
  totalCents: Cents
  /** Base de cálculo. Zero em compromissos de valor fixo. */
  baseCents: Cents
  parts: readonly CommitmentPartView[]
  /** Quanto ainda falta pagar. */
  outstandingCents: Cents
  settledCents: Cents
  /** Quanto o compromisso subiu desde o último lançamento de renda. */
  deltaCents?: Cents
  className?: string
}

export function CommitmentCard({
  name,
  totalCents,
  baseCents,
  parts,
  outstandingCents,
  settledCents,
  deltaCents,
  className,
}: CommitmentCardProps) {
  const totalRate = parts.reduce((sum, part) => sum + part.rateBp, 0)
  const isProportional = parts.length > 0 && baseCents > 0

  return (
    <section
      className={cn(
        'bg-card border-border flex flex-col gap-3 rounded-lg border p-4',
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-covenant flex items-center gap-1.5 text-base font-semibold">
          <span aria-hidden="true">✦</span>
          {name}
        </h3>
        <MoneyValue cents={totalCents} size="lg" tone="covenant" />
      </header>

      {isProportional ? (
        <p className="text-muted-foreground text-sm">
          {formatRate(totalRate as BasisPoints)} de{' '}
          <span className="money">{formatAbsoluteBRL(baseCents)}</span> que
          entrou este mês
        </p>
      ) : null}

      {parts.length > 1 ? (
        <ul className="border-border flex flex-col gap-1 border-t pt-3">
          {parts.map((part) => (
            <li
              key={part.id}
              className="text-muted-foreground flex items-baseline justify-between gap-3 text-sm"
            >
              <span>{part.label}</span>
              <MoneyValue cents={part.amountCents} size="sm" tone="muted" />
            </li>
          ))}
        </ul>
      ) : null}

      {deltaCents !== undefined && deltaCents > 0 ? (
        <p className="text-covenant-soft-foreground bg-covenant-soft flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm">
          <span aria-hidden="true">↑</span>
          subiu <MoneyValue cents={deltaCents} size="sm" tone="covenant" /> com
          a última entrada
        </p>
      ) : null}

      {settledCents > 0 && outstandingCents > 0 ? (
        <p className="text-negative-soft-foreground bg-negative-soft flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm">
          <span aria-hidden="true">⚠</span>
          faltam{' '}
          <MoneyValue cents={outstandingCents} size="sm" tone="negative" />{' '}
          desde a última entrada
        </p>
      ) : null}
    </section>
  )
}
