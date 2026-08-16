'use client'

import { useMemo, useState } from 'react'

import { AmountKeypad } from '@/components/entries/amount-keypad'
import { MoneyInput } from '@/components/money/money-input'
import { MoneyValue } from '@/components/money/money-value'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  CATALOG_GROUPS,
  type CatalogItem,
  groupCatalog,
  searchCatalog,
} from '@/domain/catalog'
import { type Cents, cents, ZERO } from '@/domain/money'
import type { DueRule } from '@/domain/types'
import { cn } from '@/lib/utils'

import {
  DueRuleField,
  type DueRuleValue,
  emptyDueRule,
  isValidDueRule,
  toDueRule,
} from './due-rule-field'

/**
 * Adicionar uma conta fixa pelo NOME dela.
 *
 * O problema que isto resolve: um total agregado de "Assinaturas R$ 180" mostra
 * que você sangra, mas não o que cortar. Netflix, Spotify, Max e Disney+ lado a
 * lado, cada um com seu valor, mostram — porque aí dá para cancelar UM.
 *
 * Fluxo em dois passos, e não um formulário: primeiro QUEM, depois QUANTO. O
 * valor já vem preenchido com uma sugestão, então na maioria das vezes o
 * segundo passo é só confirmar.
 */

export type AddExpenseSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  saving?: boolean
  onAdd: (bill: {
    label: string
    amountCents: Cents
    dueRule: DueRule | null
  }) => void
}

type Draft = { label: string; amountCents: Cents; due: DueRuleValue }

export function AddExpenseSheet({
  open,
  onOpenChange,
  saving = false,
  onAdd,
}: AddExpenseSheetProps) {
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [expanded, setExpanded] = useState<string[]>([])

  const groups = useMemo(() => groupCatalog(searchCatalog(query)), [query])
  const trimmed = query.trim()
  const openGroups = trimmed === '' ? expanded : groups.map(([group]) => group)

  function pick(item: CatalogItem) {
    setDraft({
      label: item.name,
      amountCents: cents(item.suggestedCents),
      due: emptyDueRule,
    })
  }

  function close() {
    onOpenChange(false)
    setQuery('')
    setDraft(null)
  }

  if (draft) {
    return (
      <Sheet open={open} onOpenChange={(next) => (next ? null : close())}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{draft.label || 'Nova conta'}</SheetTitle>
            <SheetDescription>
              Confira o valor. Dá para ajustar depois.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
            {/* Quando veio do catálogo o nome já está certo; quando a pessoa
                escolheu digitar, ele precisa ser preenchido aqui. */}
            {draft.label === '' ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Nome da conta</span>
                <input
                  autoFocus
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, label: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Ex: mensalidade do prédio"
                  className="border-input focus-visible:ring-ring h-12 rounded-lg border bg-transparent px-4 text-base outline-none focus-visible:ring-2"
                />
              </label>
            ) : null}

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Valor mensal</span>
                <MoneyInput
                  value={draft.amountCents}
                  onChange={(amountCents) =>
                    setDraft((current) =>
                      current ? { ...current, amountCents } : current,
                    )
                  }
                  className="h-14 px-4 text-lg"
                />
              </label>

              {/* O teclado próprio só no celular: no desktop o teclado de
                  verdade está logo ali, e ocupar meia tela com dígitos seria
                  desperdício de espaço. */}
              <div className="lg:hidden">
                <AmountKeypad
                  value={draft.amountCents}
                  onChange={(amountCents) =>
                    setDraft((current) =>
                      current ? { ...current, amountCents } : current,
                    )
                  }
                />
              </div>
            </div>

            {/* Vencimento é OPCIONAL. Quem preenche ganha o lembrete na tela
                inicial; quem não preenche não é cobrado por isso. */}
            <DueRuleField
              value={draft.due}
              onChange={(due) =>
                setDraft((current) => (current ? { ...current, due } : current))
              }
            />

            <p className="text-muted-foreground bg-muted rounded-lg px-4 py-3 text-sm text-balance">
              O valor sugerido é só um ponto de partida — preço de assinatura
              muda e varia por plano. Coloque o que sai da sua conta.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                size="block"
                disabled={
                  draft.amountCents === ZERO ||
                  draft.label.trim() === '' ||
                  !isValidDueRule(draft.due) ||
                  saving
                }
                onClick={() => {
                  onAdd({
                    label: draft.label.trim(),
                    amountCents: draft.amountCents,
                    dueRule: toDueRule(draft.due),
                  })
                  close()
                }}
              >
                {saving ? 'Salvando…' : 'Adicionar'}
              </Button>
              <Button variant="quiet" onClick={() => setDraft(null)}>
                ← Escolher outro
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : close())}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>O que sai todo mês?</SheetTitle>
          <SheetDescription>
            Busque pelo nome. Netflix, academia, seguro do carro…
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-6">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar…"
            // 16px é o mínimo: abaixo disso o Safari dá zoom no foco.
            className="border-input focus-visible:ring-ring h-12 shrink-0 rounded-lg border bg-transparent px-4 text-base outline-none focus-visible:ring-2"
          />

          {groups.length === 0 && trimmed !== '' ? (
            <button
              type="button"
              onClick={() =>
                setDraft({ label: trimmed, amountCents: ZERO, due: emptyDueRule })
              }
              className="border-input hover:bg-muted animate-fade flex min-h-14 items-center gap-3 rounded-lg border border-dashed px-4 text-left transition-colors"
            >
              <span aria-hidden="true">＋</span>
              <span className="flex flex-col">
                <span className="font-medium">Criar “{trimmed}”</span>
                <span className="text-muted-foreground text-xs">
                  Não está na lista? Adicione do seu jeito.
                </span>
              </span>
            </button>
          ) : null}

          {/* Agrupado e recolhível: "tenho gastos com streaming" vem antes de
              "quais streamings". Buscando, tudo que tem resultado já abre. */}
          <Accordion
            type="multiple"
            value={openGroups}
            onValueChange={setExpanded}
            className="flex flex-col gap-2"
          >
            {groups.map(([group, items]) => (
              <AccordionItem
                key={group}
                value={group}
                className="border-border rounded-lg border px-4 last:border-b"
              >
                <AccordionTrigger className="min-h-14 hover:no-underline">
                  <span className="flex flex-1 items-center gap-3 text-left">
                    <span aria-hidden="true" className="text-lg">
                      {CATALOG_GROUPS[group].emoji}
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="font-medium">
                        {CATALOG_GROUPS[group].label}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {items.length} opções
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>

                <AccordionContent>
                  <ul className="flex flex-col gap-1.5 pb-2">
                    {items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => pick(item)}
                          className={cn(
                            'border-border hover:bg-muted flex min-h-14 w-full items-center gap-3 rounded-lg border px-4 text-left',
                            'transition-colors duration-150 active:scale-[0.99]',
                          )}
                        >
                          <span aria-hidden="true" className="text-lg">
                            {item.emoji}
                          </span>
                          <span className="flex-1 truncate font-medium">
                            {item.name}
                          </span>
                          <span className="text-muted-foreground flex items-baseline gap-1 text-sm">
                            <span aria-hidden="true">≈</span>
                            <MoneyValue
                              cents={cents(item.suggestedCents)}
                              size="sm"
                              tone="muted"
                              hideCentsWhenZero
                            />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {trimmed === '' ? (
            <button
              type="button"
              onClick={() =>
                setDraft({ label: '', amountCents: ZERO, due: emptyDueRule })
              }
              className="text-muted-foreground hover:text-foreground min-h-12 text-sm transition-colors"
            >
              Não achei o meu — quero digitar
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
