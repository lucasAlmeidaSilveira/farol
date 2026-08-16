'use client'

import { MoneyValue } from '@/components/money/money-value'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DueItem, DueStatus } from '@/engine'
import { outstandingTotal } from '@/engine'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * O lembrete de contas a vencer.
 *
 * Uma lista de contas sem ordem é inventário, não lembrete. Aqui a ordem é a
 * informação: atrasadas primeiro, depois por data. É a única pergunta que
 * importa nesta seção — "o que eu preciso pagar AGORA?".
 *
 * O estado é comunicado por três camadas, não só por cor: um marcador de forma
 * diferente, um texto explícito ("atrasada", "vence hoje", "em 2 dias") e a
 * cor. Em escala de cinza a informação continua inteira.
 */

const STATUS: Record<
  DueStatus,
  { label: (days: number) => string; dot: string; tone: string }
> = {
  overdue: {
    label: (days) =>
      days === -1 ? 'atrasada 1 dia' : `atrasada ${-days} dias`,
    dot: 'bg-negative',
    tone: 'text-negative font-medium',
  },
  today: {
    label: () => 'vence hoje',
    dot: 'bg-covenant',
    tone: 'text-covenant font-medium',
  },
  soon: {
    label: (days) => (days === 1 ? 'vence amanhã' : `em ${days} dias`),
    dot: 'bg-covenant/60',
    tone: 'text-muted-foreground',
  },
  upcoming: {
    label: (days) => `em ${days} dias`,
    dot: 'bg-muted-foreground/40',
    tone: 'text-muted-foreground',
  },
  settled: {
    label: () => 'paga',
    dot: 'bg-positive',
    tone: 'text-positive',
  },
}

export type DuePanelProps = {
  items: readonly DueItem[]
  onSettle?: (item: DueItem) => void
  settling?: boolean
  className?: string
}

export function DuePanel({
  items,
  onSettle,
  settling = false,
  className,
}: DuePanelProps) {
  // Sem nenhuma conta com data, a seção some. Cadastrar vencimento é opcional,
  // e um card vazio cobrando isso seria ruído.
  if (items.length === 0) return null

  const pending = items.filter((item) => item.status !== 'settled')
  const overdue = items.filter((item) => item.status === 'overdue')

  return (
    <Card className={cn('animate-rise', className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">A vencer</CardTitle>
        <CardDescription>
          {overdue.length > 0
            ? `${overdue.length} ${overdue.length === 1 ? 'conta atrasada' : 'contas atrasadas'}`
            : pending.length > 0
              ? `${pending.length} ${pending.length === 1 ? 'conta' : 'contas'} este mês`
              : 'tudo pago por aqui'}
        </CardDescription>
        {pending.length > 0 ? (
          <CardAction>
            <MoneyValue
              cents={outstandingTotal(pending)}
              size="lg"
              tone={overdue.length > 0 ? 'negative' : 'default'}
            />
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent>
        <ul className="flex flex-col">
          {items.map((item) => {
            const status = STATUS[item.status]

            return (
              <li
                key={item.commitmentId}
                className="border-border flex items-center gap-3 border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0 rounded-full', status.dot)}
                />

                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={cn(
                      'truncate text-sm font-medium',
                      item.status === 'settled' &&
                        'text-muted-foreground line-through',
                    )}
                  >
                    {item.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDate(item.dueDate)}
                    {/* Dizer "5º dia útil" ao lado da data explica POR QUE ela
                        é aquela — sem isso, um vencimento em 7 de agosto para
                        quem configurou "5" parece erro do app. */}
                    {item.rule.type === 'businessDay'
                      ? ` (${item.rule.n}º dia útil)`
                      : ''}{' '}
                    ·{' '}
                    <span className={status.tone}>
                      {status.label(item.daysUntil)}
                    </span>
                  </span>
                </span>

                <MoneyValue
                  cents={
                    item.status === 'settled'
                      ? item.amountCents
                      : item.outstandingCents
                  }
                  size="sm"
                  tone={item.status === 'settled' ? 'muted' : 'default'}
                />

                {item.status === 'settled' ? (
                  <Badge variant="secondary" className="shrink-0">
                    <span aria-hidden="true">✓</span>
                    <span className="sr-only">Paga</span>
                  </Badge>
                ) : onSettle ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={settling}
                    onClick={() => onSettle(item)}
                    className="shrink-0"
                  >
                    Paguei
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
