'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { EntryInput } from '@/data/payloads'
import { errorMessage } from '@/data/session'
import { type Cents, ZERO } from '@/domain/money'
import { addDays, type LocalDate, todayIn } from '@/domain/period'
import { type EngineInput, type IncomeImpact, simulateIncome } from '@/engine'
import { useCreateEntry } from '@/hooks/entries/use-create-entry'
import { cn } from '@/lib/utils'

import { AmountKeypad } from './amount-keypad'

/**
 * Lançamento em três toques: abrir → digitar → salvar.
 *
 * Cada campo a mais aqui custa adesão. Categoria, data e descrição têm padrões
 * bons o bastante para o caso comum, e só aparecem quando alguém quer mexer.
 * Para um público que já abandonou app de finanças por atrito, isso é a
 * diferença entre usar e desinstalar.
 */

const CATEGORIES = [
  'Mercado',
  'Transporte',
  'Comida',
  'Casa',
  'Saúde',
  'Lazer',
  'Outros',
] as const

export type QuickEntrySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultKind?: 'expense' | 'income'
  /** Necessário para simular o impacto ANTES de salvar. */
  engineInput: EngineInput | undefined
  onIncomeRegistered?: (impact: IncomeImpact) => void
}

export function QuickEntrySheet({
  open,
  onOpenChange,
  defaultKind = 'expense',
  engineInput,
  onIncomeRegistered,
}: QuickEntrySheetProps) {
  const create = useCreateEntry()

  const [kind, setKind] = useState<'expense' | 'income'>(defaultKind)
  const [amount, setAmount] = useState<Cents>(ZERO)
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [dayOffset, setDayOffset] = useState(0)
  const [description, setDescription] = useState('')

  const today = todayIn('America/Sao_Paulo')
  const date: LocalDate = addDays(today, dayOffset)

  function reset() {
    setAmount(ZERO)
    setDescription('')
    setDayOffset(0)
  }

  async function save() {
    if (amount === ZERO) return

    const input: EntryInput =
      kind === 'income'
        ? {
            kind: 'income',
            amountCents: amount,
            date,
            description: description || 'Entrada',
            sourceId: null,
          }
        : {
            kind: 'expense',
            amountCents: amount,
            date,
            description: description || category,
            categoryId: null,
          }

    // O impacto é calculado ANTES de salvar, pela diferença entre dois cálculos
    // completos da engine. Depois de salvo o listener já mudou o estado, e não
    // haveria mais um "antes" para comparar.
    const impact =
      kind === 'income' && engineInput
        ? simulateIncome(engineInput, {
            amountCents: amount,
            sourceId: null,
            date,
            closesForecast: false,
          })
        : null

    try {
      await create.mutateAsync(input)
      onOpenChange(false)
      reset()

      if (impact) {
        onIncomeRegistered?.(impact)
      } else {
        // Gasto ganha só a confirmação seca: o insight é da renda.
        toast.success(`${description || category} lançado`)
      }
    } catch (caught) {
      toast.error(errorMessage(caught))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>
            {kind === 'income' ? 'Entrou dinheiro' : 'Lancei um gasto'}
          </SheetTitle>
          <SheetDescription>
            {kind === 'income'
              ? 'Vou recalcular seus compromissos na hora.'
              : 'Só o valor já basta — o resto é opcional.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
          <Tabs
            value={kind}
            onValueChange={(next: string) =>
              setKind(next as 'expense' | 'income')
            }
          >
            <TabsList className="w-full">
              <TabsTrigger value="expense">Gasto</TabsTrigger>
              <TabsTrigger value="income">Entrada</TabsTrigger>
            </TabsList>
          </Tabs>

          <AmountKeypad value={amount} onChange={setAmount} />

          {kind === 'expense' ? (
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                  className={cn(
                    'min-h-11 rounded-full border px-3.5 text-sm transition-colors',
                    category === item
                      ? 'border-accent-border bg-accent text-accent-foreground'
                      : 'border-input hover:bg-muted',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2">
            <DayChip active={dayOffset === 0} onClick={() => setDayOffset(0)}>
              hoje
            </DayChip>
            <DayChip active={dayOffset === -1} onClick={() => setDayOffset(-1)}>
              ontem
            </DayChip>
          </div>

          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-label="Descrição"
            placeholder={
              kind === 'income'
                ? 'De onde veio? (opcional)'
                : 'Onde? (opcional)'
            }
            // 16px é o mínimo: abaixo disso o Safari dá zoom no foco.
            className="h-12 text-base"
          />

          <Button
            size="block"
            variant={kind === 'income' ? 'accent' : 'default'}
            disabled={amount === ZERO || create.isPending}
            onClick={() => void save()}
          >
            Salvar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DayChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-full border px-4 text-sm transition-colors',
        active ? 'border-foreground' : 'border-input text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}
