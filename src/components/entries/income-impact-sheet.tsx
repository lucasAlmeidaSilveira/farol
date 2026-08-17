'use client'

import { MoneyValue } from '@/components/money/money-value'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { applyRate, basisPoints, type Cents, cents } from '@/domain/money'
import type { IncomeImpact } from '@/engine'

/**
 * O momento mágico do produto.
 *
 * Quando entra renda, a Comunhão de Bens sobe junto — e é exatamente isso que a
 * pessoa não consegue calcular de cabeça. Mostrar esse encadeamento é o que
 * transforma um app de lançamento num app que ENSINA a própria regra.
 *
 * Deliberadamente NÃO é um toast: o toast é pequeno demais para o insight
 * central do produto, e some antes de a pessoa entender. O Sonner fica só para
 * a confirmação seca de gastos.
 *
 * Todos os números vêm de `simulateIncome`, que é a diferença entre dois
 * cálculos completos da engine. Nunca a alíquota aplicada sobre o incremento —
 * essa arredonda diferente e faria a tela mentir sobre o que já aconteceu.
 */

export type IncomeImpactSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  impact: IncomeImpact | null
  onUndo?: () => void
}

export function IncomeImpactSheet({
  open,
  onOpenChange,
  impact,
  onUndo,
}: IncomeImpactSheetProps) {
  if (!impact) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Entrou dinheiro</SheetTitle>
          <SheetDescription>Veja o que isso muda no seu mês.</SheetDescription>
        </SheetHeader>

        <SheetBody className="gap-6">
          <p className="text-center">
            <MoneyValue cents={impact.incomeCents} size="xl" tone="positive" />
          </p>

          <div className="flex flex-col gap-4">
            {impact.byCommitment.map((item) => (
              <ImpactRow
                key={item.commitmentId}
                icon="✦"
                label={item.name}
                before={item.beforeCents}
                after={item.afterCents}
                delta={item.deltaCents}
                tone="covenant"
              />
            ))}

            <ImpactRow
              icon="◎"
              label="Livre para gastar"
              before={impact.availableBeforeCents}
              after={impact.availableAfterCents}
              delta={impact.availableDeltaCents}
              tone="positive"
            />
          </div>

          {impact.commitmentDeltaCents > 0 ? (
            <p className="text-muted-foreground bg-muted rounded-lg px-4 py-3 text-sm text-balance">
              De cada R$ 100 que entra,{' '}
              <MoneyValue
                cents={applyRate(cents(10_000), rateOf(impact))}
                size="sm"
                tone="covenant"
                hideCentsWhenZero
              />{' '}
              vão para o compromisso e o resto fica com você.
            </p>
          ) : null}
        </SheetBody>

        <SheetFooter>
          <Button size="block" onClick={() => onOpenChange(false)}>
            Beleza
          </Button>
          {onUndo ? (
            <Button variant="quiet" onClick={onUndo}>
              Desfazer
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function ImpactRow({
  icon,
  label,
  before,
  after,
  delta,
  tone,
}: {
  icon: string
  label: string
  before: Cents
  after: Cents
  delta: Cents
  tone: 'covenant' | 'positive'
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <span aria-hidden="true">{icon}</span>
        {label}
      </p>

      <p className="flex flex-wrap items-baseline gap-2">
        <MoneyValue cents={before} size="sm" tone="muted" />
        <span aria-hidden="true" className="text-muted-foreground">
          →
        </span>
        <MoneyValue cents={after} size="lg" tone={tone} />
        <span
          className={
            tone === 'covenant'
              ? 'text-covenant-soft-foreground bg-covenant-soft rounded-full px-2 py-0.5 text-xs'
              : 'text-positive-soft-foreground bg-positive-soft rounded-full px-2 py-0.5 text-xs'
          }
        >
          <span aria-hidden="true">↑ </span>
          <MoneyValue cents={delta} size="sm" tone={tone} sign="never" />
        </span>
      </p>
    </div>
  )
}

/** A alíquota efetiva observada — derivada do impacto, não presumida. */
function rateOf(impact: IncomeImpact) {
  if (impact.incomeCents === 0) return basisPoints(0)
  return basisPoints(
    Math.round((impact.commitmentDeltaCents / impact.incomeCents) * 10_000),
  )
}
