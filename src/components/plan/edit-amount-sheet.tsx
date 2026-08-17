'use client'

import { useState } from 'react'

import { AmountKeypad } from '@/components/entries/amount-keypad'
import { MoneyInput } from '@/components/money/money-input'
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
import { type Cents, ZERO } from '@/domain/money'
import type { DueRule } from '@/domain/types'
import type { EditScope } from '@/hooks/plan/use-edit-plan'
import { cn } from '@/lib/utils'

import {
  DueRuleField,
  type DueRuleValue,
  fromDueRule,
  isValidDueRule,
  toDueRule,
} from './due-rule-field'

/**
 * Editar uma linha do plano: valor e o dia do mês.
 *
 * A escolha de escopo é o que preserva o histórico — e por isso ela é
 * apresentada como uma pergunta em linguagem natural, não como um seletor
 * técnico. "Deste mês em diante" nunca reescreve meses já vividos: a regra
 * antiga é encerrada e uma nova começa.
 *
 * O DIA foge dessa regra, de propósito: ele é uma característica da conta, não
 * um valor do mês. "A Netflix passou a vencer dia 15" é uma mudança permanente,
 * e o modelo não guarda dia por competência. A tela diz isso em vez de fingir
 * que o escopo se aplica aos dois campos.
 */

export type EditChanges = {
  name: string
  amountCents: Cents
  /** Regra de vencimento, para contas. */
  dueRule: DueRule | null
  /** Quando a renda cai — mesma forma do vencimento, por dia ou por dia útil. */
  expectedRule: DueRule | null
}

export type EditAmountSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName: string
  initialCents: Cents
  /** Muda os rótulos; a forma do campo de dia é a mesma nos dois. */
  mode: 'bill' | 'income'
  initialDueRule?: DueRule | null
  initialExpectedRule?: DueRule | null
  /** Quando falso, o sheet salva direto sem perguntar o escopo. */
  askScope?: boolean
  saving?: boolean
  onSave: (changes: EditChanges, scope: EditScope) => void
}

export function EditAmountSheet({
  open,
  onOpenChange,
  initialName,
  initialCents,
  mode,
  initialDueRule = null,
  initialExpectedRule = null,
  askScope = true,
  saving = false,
  onSave,
}: EditAmountSheetProps) {
  /*
    Sem efeito de sincronização aqui: quem usa este sheet o renderiza de forma
    condicional, então cada abertura é uma MONTAGEM nova e o `useState` já
    recebe o valor atual. Um `useEffect` copiando prop para estado seria
    redundante — e é justamente o padrão que o React 19 passou a sinalizar.
  */
  const [name, setName] = useState(initialName)
  const [amount, setAmount] = useState<Cents>(initialCents)
  /*
    Renda e conta compartilham o MESMO campo desde que "dia útil" passou a valer
    para as duas. Salário no quinto dia útil é a regra da folha, não exceção — e
    manter dois campos diferentes fazia a mesma pergunta de dois jeitos.
  */
  const initialRule = mode === 'bill' ? initialDueRule : initialExpectedRule
  const [due, setDue] = useState<DueRuleValue>(() => fromDueRule(initialRule))
  const [scope, setScope] = useState<EditScope>('fromNowOn')

  const validDue = isValidDueRule(due)

  const dayChanged =
    JSON.stringify(toDueRule(due)) !== JSON.stringify(initialRule)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{initialName}</SheetTitle>
          <SheetDescription>
            {askScope
              ? 'Escolha se vale só neste mês ou daqui em diante.'
              : 'Ajuste os dados desta linha.'}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome da conta"
              aria-invalid={name.trim() === ''}
              className="h-12 text-base"
            />
            {name.trim() === '' ? (
              <p className="text-negative text-sm">
                O nome não pode ficar vazio.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            <Label htmlFor="edit-amount">Valor</Label>
            <MoneyInput
              id="edit-amount"
              value={amount}
              onChange={setAmount}
              className="h-14 px-4 text-lg"
            />

            {/* O teclado próprio só no celular: no desktop o teclado de verdade
                está logo ali. */}
            <div className="lg:hidden">
              <AmountKeypad value={amount} onChange={setAmount} />
            </div>
          </div>

          <DueRuleField
            value={due}
            onChange={setDue}
            label={mode === 'bill' ? 'Vencimento' : 'Quando cai'}
          />

          {askScope ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-muted-foreground pb-2 text-sm">
                O novo valor vale a partir de quando?
              </legend>

              <ScopeOption
                active={scope === 'fromNowOn'}
                onClick={() => setScope('fromNowOn')}
                label="Deste mês em diante"
                hint="Os meses anteriores continuam como estão."
              />
              <ScopeOption
                active={scope === 'thisMonth'}
                onClick={() => setScope('thisMonth')}
                label="Só neste mês"
                hint="Um ajuste pontual; o plano volta ao normal no mês que vem."
              />

              {/* Honestidade sobre o alcance: o escopo governa o valor, não o
                  dia. Fingir o contrário produziria uma expectativa errada
                  sobre o que aconteceu. */}
              {scope === 'thisMonth' && dayChanged ? (
                <p className="text-muted-foreground bg-muted rounded-lg px-3 py-2 text-xs text-balance">
                  O nome e o vencimento são características da conta, então
                  mudam para todos os meses — só o valor fica restrito a este.
                </p>
              ) : null}
            </fieldset>
          ) : null}
        </SheetBody>

        <SheetFooter>
          <Button
            size="block"
            disabled={
              amount === ZERO || name.trim() === '' || !validDue || saving
            }
            onClick={() =>
              onSave(
                {
                  name: name.trim(),
                  amountCents: amount,
                  dueRule: mode === 'bill' ? toDueRule(due) : null,
                  expectedRule: mode === 'income' ? toDueRule(due) : null,
                },
                scope,
              )
            }
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function ScopeOption({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors duration-150',
        active ? 'border-accent-border bg-accent/10' : 'border-input',
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground text-sm">{hint}</span>
    </button>
  )
}
