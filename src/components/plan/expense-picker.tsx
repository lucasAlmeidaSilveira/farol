'use client'

import { m } from 'motion/react'
import { useMemo, useState } from 'react'

import { MoneyInput } from '@/components/money/money-input'
import { MoneyValue } from '@/components/money/money-value'
import { DURATION } from '@/components/motion/transitions'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CATALOG_GROUPS,
  type CatalogGroup,
  type CatalogItem,
  groupCatalog,
  searchCatalog,
} from '@/domain/catalog'
import { type Cents, cents } from '@/domain/money'
import { cn } from '@/lib/utils'

/**
 * O seletor de gastos recorrentes, agrupado por categoria.
 *
 * A lista plana de 40 itens obrigava a caçar; agrupada, ela acompanha o jeito
 * como a pessoa pensa: primeiro "eu tenho gastos com streaming", depois "quais
 * streamings". Cada categoria mostra quantos você já marcou e quanto somam, o
 * que responde a pergunta que o app existe para responder — não "quanto gasto
 * com assinaturas", mas "com QUAIS assinaturas".
 *
 * Buscar continua funcionando e abre as categorias com resultado, para quem já
 * sabe o nome não precisar navegar.
 */

export type PickedBill = {
  id: string
  label: string
  amountCents: Cents
}

export type ExpensePickerProps = {
  selected: readonly PickedBill[]
  onToggle: (item: CatalogItem) => void
  onSetAmount: (id: string, amountCents: Cents) => void
  onAddCustom: (label: string) => void
  onRemove: (id: string) => void
  onRenameCustom: (id: string, label: string) => void
  /** Prefixo dos ids criados à mão. */
  customPrefix: string
}

export function ExpensePicker({
  selected,
  onToggle,
  onSetAmount,
  onAddCustom,
  onRemove,
  onRenameCustom,
  customPrefix,
}: ExpensePickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string[]>([])

  const trimmed = query.trim()
  const searching = trimmed !== ''

  const groups = useMemo(() => groupCatalog(searchCatalog(trimmed)), [trimmed])

  // Buscando, tudo que tem resultado abre sozinho: navegar por categoria
  // depois de já ter digitado o nome seria trabalho repetido.
  const openGroups = searching ? groups.map(([group]) => group) : open

  const customBills = selected.filter((bill) =>
    bill.id.startsWith(customPrefix),
  )

  const exactMatch = groups.some(([, items]) =>
    items.some((item) => item.name.toLowerCase() === trimmed.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar: Netflix, academia, seguro…"
        aria-label="Buscar gasto"
        className="h-12 text-base"
      />

      {/* Aparece só quando a busca não acha nada: a entrada suave evita que o
          botão pisque na tela a cada tecla digitada. */}
      {searching && !exactMatch ? (
        <m.button
          type="button"
          onClick={() => {
            onAddCustom(trimmed)
            setQuery('')
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DURATION.reaction }}
          className="border-input hover:bg-muted flex min-h-14 items-center gap-3 rounded-lg border border-dashed px-4 text-left transition-colors duration-150"
        >
          <span aria-hidden="true">＋</span>
          <span className="flex flex-col">
            <span className="font-medium">Criar “{trimmed}”</span>
            <span className="text-muted-foreground text-xs">
              Não está na lista? Adicione com o seu nome.
            </span>
          </span>
        </m.button>
      ) : null}

      {customBills.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-eyebrow text-muted-foreground uppercase">
            Seus gastos
          </h3>

          <ul className="flex flex-col gap-2">
            {customBills.map((bill) => (
              <li key={bill.id} className="flex flex-col gap-1.5">
                <div className="border-accent-border bg-accent/10 flex min-h-14 items-center gap-3 rounded-lg border px-4">
                  <span aria-hidden="true" className="text-lg">
                    📝
                  </span>
                  <input
                    value={bill.label}
                    onChange={(event) =>
                      onRenameCustom(bill.id, event.target.value)
                    }
                    aria-label="Nome do gasto"
                    placeholder="Nome do gasto"
                    /* Sem borda: já está dentro de um card com borda, e
                       aninhar dois contornos polui. */
                    className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base font-medium outline-none"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${bill.label || 'gasto'}`}
                    onClick={() => onRemove(bill.id)}
                    className="text-muted-foreground shrink-0"
                  >
                    <span aria-hidden="true">×</span>
                  </Button>
                </div>

                <AmountRow
                  name={bill.label || 'gasto'}
                  amountCents={bill.amountCents}
                  onSet={(amount) => onSetAmount(bill.id, amount)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Accordion
        type="multiple"
        value={openGroups}
        onValueChange={setOpen}
        className="flex flex-col gap-2"
      >
        {groups.map(([group, items]) => (
          <GroupSection
            key={group}
            group={group}
            items={items}
            selected={selected}
            onToggle={onToggle}
            onSetAmount={onSetAmount}
          />
        ))}
      </Accordion>

      {groups.length === 0 && !searching ? (
        <p className="text-muted-foreground text-sm">Nada por aqui ainda.</p>
      ) : null}

      <button
        type="button"
        onClick={() => onAddCustom('')}
        className="text-muted-foreground hover:text-foreground min-h-12 text-sm transition-colors duration-150"
      >
        ＋ Adicionar um gasto que não está na lista
      </button>
    </div>
  )
}

function GroupSection({
  group,
  items,
  selected,
  onToggle,
  onSetAmount,
}: {
  group: CatalogGroup
  items: readonly CatalogItem[]
  selected: readonly PickedBill[]
  onToggle: (item: CatalogItem) => void
  onSetAmount: (id: string, amountCents: Cents) => void
}) {
  const chosen = items.filter((item) =>
    selected.some((bill) => bill.id === item.id),
  )
  const total = selected
    .filter((bill) => chosen.some((item) => item.id === bill.id))
    .reduce<number>((sum, bill) => sum + bill.amountCents, 0)

  return (
    <AccordionItem
      value={group}
      className="border-border rounded-lg border px-4 last:border-b"
    >
      <AccordionTrigger className="min-h-14 hover:no-underline">
        <span className="flex flex-1 items-center gap-3 text-left">
          <span aria-hidden="true" className="text-lg">
            {CATALOG_GROUPS[group].emoji}
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-medium">{CATALOG_GROUPS[group].label}</span>
            <span className="text-muted-foreground text-xs">
              {chosen.length > 0
                ? `${chosen.length} marcado${chosen.length > 1 ? 's' : ''}`
                : `${items.length} opções`}
            </span>
          </span>
          {chosen.length > 0 ? (
            <Badge variant="secondary" className="money mr-2">
              <MoneyValue cents={total as Cents} size="sm" hideCentsWhenZero />
            </Badge>
          ) : null}
        </span>
      </AccordionTrigger>

      <AccordionContent>
        <ul className="flex flex-col gap-2 pb-2">
          {items.map((item) => {
            const picked = selected.find((bill) => bill.id === item.id)

            return (
              <li key={item.id} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  aria-pressed={Boolean(picked)}
                  onClick={() => onToggle(item)}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-3 rounded-lg border px-4 text-left',
                    'transition-colors duration-150 active:scale-[0.99]',
                    picked
                      ? 'border-accent-border bg-accent/10'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <span aria-hidden="true" className="text-lg">
                    {item.emoji}
                  </span>
                  <span className="flex-1 truncate font-medium">
                    {item.name}
                  </span>
                  <span className="flex items-baseline gap-1">
                    {picked ? null : (
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground text-sm"
                      >
                        ≈
                      </span>
                    )}
                    <MoneyValue
                      cents={picked?.amountCents ?? cents(item.suggestedCents)}
                      size="sm"
                      tone={picked ? 'default' : 'muted'}
                      hideCentsWhenZero
                    />
                  </span>
                </button>

                {picked ? (
                  <AmountRow
                    name={item.name}
                    amountCents={picked.amountCents}
                    onSet={(amount) => onSetAmount(item.id, amount)}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      </AccordionContent>
    </AccordionItem>
  )
}

/**
 * Os dois caminhos para o valor, lado a lado.
 *
 * O ± serve para aproximar sem pensar; o campo serve para quem já sabe o valor
 * exato — chegar em R$ 44,90 só no ± daria nove toques.
 */
function AmountRow({
  name,
  amountCents,
  onSet,
}: {
  name: string
  amountCents: Cents
  onSet: (value: Cents) => void
}) {
  const adjust = (delta: number) =>
    onSet(Math.max(0, amountCents + delta) as Cents)

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.reaction }}
      className="flex items-center gap-2 pl-4"
    >
      <Button
        variant="outline"
        size="icon"
        aria-label={`Diminuir ${name} em R$ 50`}
        onClick={() => adjust(-5000)}
      >
        <span aria-hidden="true">−</span>
      </Button>

      <MoneyInput
        aria-label={`Valor de ${name}`}
        value={amountCents}
        onChange={onSet}
        className="w-32 text-center"
      />

      <Button
        variant="outline"
        size="icon"
        aria-label={`Aumentar ${name} em R$ 50`}
        onClick={() => adjust(5000)}
      >
        <span aria-hidden="true">+</span>
      </Button>
    </m.div>
  )
}
