'use client'

import { useState } from 'react'

import { MoneyInput } from '@/components/money/money-input'
import {
  DueRuleField,
  type DueRuleValue,
  emptyDueRule,
  isValidDueRule,
  toDueRule,
} from '@/components/plan/due-rule-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { type Cents, ZERO } from '@/domain/money'
import type { DueRule, IncomeKind } from '@/domain/types'
import { cn } from '@/lib/utils'

/**
 * Adicionar uma fonte de renda.
 *
 * A distinção entre fixa e variável não é burocracia — ela muda o cálculo. A
 * renda fixa entra no "disponível" como previsão, desde o dia 1 do mês; a
 * variável só entra quando cai de verdade. É o que impede o app de prometer um
 * dinheiro que talvez não venha.
 */

export type NewIncome = {
  name: string
  kind: IncomeKind
  amountCents: Cents
  /** Por dia do mês OU por dia útil — folha de pagamento usa as duas formas. */
  expectedRule: DueRule | null
}

export type AddIncomeSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  saving?: boolean
  onAdd: (income: NewIncome) => void
}

const SUGGESTIONS = [
  'Salário',
  '13º salário',
  'Freelas',
  'Aluguel recebido',
  'Aposentadoria',
  'Pensão',
  'Vale-alimentação',
] as const

export function AddIncomeSheet({
  open,
  onOpenChange,
  saving = false,
  onAdd,
}: AddIncomeSheetProps) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<IncomeKind>('fixed')
  const [amount, setAmount] = useState<Cents>(ZERO)
  const [when, setWhen] = useState<DueRuleValue>(emptyDueRule)

  function close() {
    onOpenChange(false)
    setName('')
    setKind('fixed')
    setAmount(ZERO)
    setWhen(emptyDueRule)
  }

  const validWhen = isValidDueRule(when)

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : close())}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>De onde vem esse dinheiro?</SheetTitle>
          <SheetDescription>
            Fixa entra no seu número desde o dia 1. Variável só quando cair.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Tabs
            value={kind}
            onValueChange={(next: string) => setKind(next as IncomeKind)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="fixed">Fixa</TabsTrigger>
              <TabsTrigger value="variable">Variável</TabsTrigger>
            </TabsList>
          </Tabs>

          <p className="text-muted-foreground bg-muted rounded-lg px-4 py-3 text-sm text-balance">
            {kind === 'fixed'
              ? 'Cai todo mês, no mesmo valor aproximado. Já conta no seu disponível antes de cair.'
              : 'Entra de vez em quando. Só conta depois que você registrar que caiu — assim o app nunca promete o que não veio.'}
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="income-name">Nome</Label>
            <Input
              id="income-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Salário, freelas, aluguel…"
              className="h-12 text-base"
            />

            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setName(item)}
                  className={cn(
                    'border-border hover:bg-muted min-h-11 rounded-full border px-3.5 text-sm',
                    'transition-colors duration-150',
                    name === item && 'border-accent-border bg-accent/10',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="income-amount">
              {kind === 'fixed' ? 'Quanto cai por mês' : 'Quanto costuma vir'}
            </Label>
            <MoneyInput
              id="income-amount"
              value={amount}
              onChange={setAmount}
              className="h-14 px-4 text-lg"
            />
          </div>

          {kind === 'fixed' ? (
            <DueRuleField value={when} onChange={setWhen} label="Quando cai" />
          ) : null}
        </SheetBody>

        <SheetFooter>
          <Button
            size="block"
            disabled={
              name.trim() === '' || amount === ZERO || !validWhen || saving
            }
            onClick={() => {
              onAdd({
                name: name.trim(),
                kind,
                amountCents: amount,
                expectedRule: toDueRule(when),
              })
              close()
            }}
          >
            {saving ? 'Salvando…' : 'Adicionar renda'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
