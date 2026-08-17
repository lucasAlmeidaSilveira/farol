'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { EntryInput } from '@/data/payloads'
import { errorMessage } from '@/data/session'
import { DEFAULT_CATEGORIES } from '@/domain/categories'
import { type Cents, ZERO } from '@/domain/money'
import { type LocalDate, todayIn } from '@/domain/period'
import type { CategoryId } from '@/domain/types'
import { type EngineInput, type IncomeImpact, simulateIncome } from '@/engine'
import { useCreateEntry } from '@/hooks/entries/use-create-entry'

import { AmountKeypad } from './amount-keypad'
import { DateField } from './date-field'

/**
 * Lançamento em três toques: abrir → digitar → salvar.
 *
 * Cada campo a mais aqui custa adesão. Categoria, data e descrição têm padrões
 * bons o bastante para o caso comum, e só aparecem quando alguém quer mexer.
 * Para um público que já abandonou app de finanças por atrito, isso é a
 * diferença entre usar e desinstalar.
 *
 * A separação visual depois do teclado não é decoração: ela diz onde termina o
 * obrigatório e começa o opcional, que é a promessa do subtítulo.
 */

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

  const today = todayIn('America/Sao_Paulo')

  const [kind, setKind] = useState<'expense' | 'income'>(defaultKind)
  const [amount, setAmount] = useState<Cents>(ZERO)
  /*
    Nenhuma categoria vem marcada.

    Pré-selecionar a primeira faria todo gasto lançado sem pensar virar
    "Mercado" — dado que a pessoa não escolheu, e que depois não dá para
    distinguir do que ela escolheu de verdade. Sem categoria é uma resposta
    honesta; categoria errada, não.
  */
  const [categoryId, setCategoryId] = useState<CategoryId | null>(null)
  const [date, setDate] = useState<LocalDate>(today)
  const [description, setDescription] = useState('')

  const category = DEFAULT_CATEGORIES.find((item) => item.id === categoryId)

  function reset() {
    setAmount(ZERO)
    setDescription('')
    setCategoryId(null)
    setDate(today)
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
            // A descrição não engole mais a categoria: ela é gravada em
            // `categoryId` e sobrevive mesmo quando a pessoa escreve algo.
            description: description || category?.name || '',
            categoryId,
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
        toast.success(`${description || category?.name || 'Gasto'} lançado`)
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

        <SheetBody>
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

          <Separator />

          <div className="flex flex-col gap-4">
            {kind === 'expense' ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-eyebrow text-muted-foreground mb-2 uppercase">
                  Categoria
                </legend>

                <div className="flex flex-wrap gap-2">
                  {DEFAULT_CATEGORIES.map((item) => {
                    const active = categoryId === item.id
                    return (
                      <Chip
                        key={item.id}
                        selected={active}
                        // Tocar de novo desmarca: escolher errado não pode
                        // virar uma escolha da qual não se sai.
                        onClick={() => setCategoryId(active ? null : item.id)}
                      >
                        {item.name}
                      </Chip>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="flex flex-col gap-2">
              <legend className="text-eyebrow text-muted-foreground mb-2 uppercase">
                Quando
              </legend>
              <DateField value={date} onChange={setDate} today={today} />
            </fieldset>

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
          </div>
        </SheetBody>

        {/*
          O rótulo muda durante a escrita, como nos outros sheets do app.
          Só desabilitar deixava o gesto mais usado do Farol sem resposta
          nenhuma — a pessoa toca, nada acontece visivelmente, e toca de novo.
        */}
        <SheetFooter>
          <Button
            size="block"
            variant={kind === 'income' ? 'accent' : 'default'}
            disabled={amount === ZERO || create.isPending}
            onClick={() => void save()}
          >
            {create.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
