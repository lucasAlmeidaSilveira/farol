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
import { Chip } from '@/components/ui/chip'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  CATALOG_GROUPS,
  type CatalogItem,
  groupCatalog,
  searchCatalog,
} from '@/domain/catalog'
import {
  installmentAmount,
  installmentUntil,
  MAX_INSTALLMENTS,
} from '@/domain/installments'
import { type Cents, cents, ZERO } from '@/domain/money'
import type { Period } from '@/domain/period'
import type { DueRule } from '@/domain/types'
import type { EditScope } from '@/hooks/plan/use-edit-plan'
import { formatPeriod } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  DueRuleField,
  type DueRuleValue,
  emptyDueRule,
  isValidDueRule,
  toDueRule,
} from './due-rule-field'
import { ScopeField } from './scope-field'

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
  /** O mês de início da vigência, para prever quando o parcelamento acaba. */
  period: Period
  /**
   * O que se está cadastrando, decidido pela seção de onde o sheet foi aberto.
   *
   * Vinha de um chip dentro do formulário, e a seção diz isso melhor: quem tocou
   * "Adicionar parcelamento" já respondeu a pergunta, e repeti-la dentro do
   * sheet era um campo a mais para o caso comum.
   */
  mode: 'bill' | 'installment'
  onAdd: (bill: {
    label: string
    /** Já é o valor MENSAL: numa compra parcelada, o total dividido. */
    amountCents: Cents
    dueRule: DueRule | null
    installments: number | null
    /** `thisMonth` cria a conta com vigência de um mês só. */
    scope: EditScope
  }) => void
}

/**
 * Sugestões de NOME para compra parcelada — sem preço.
 *
 * O catálogo de assinaturas sugere valor porque o preço da Netflix é o mesmo
 * para todo mundo. Uma viagem, um notebook e uma reforma não têm valor típico:
 * sugerir um seria inventar um número que a pessoa vai apagar.
 */
const PURCHASE_SUGGESTIONS = [
  'Viagem',
  'Celular',
  'Notebook',
  'Eletrodoméstico',
  'Móveis',
  'Curso',
  'Reforma',
  'Saúde',
] as const

type Draft = {
  label: string
  amountCents: Cents
  due: DueRuleValue
  /** Texto cru do campo de parcelas. `''` = não é compra parcelada. */
  installments: string
}

export function AddExpenseSheet({
  open,
  onOpenChange,
  saving = false,
  period,
  mode,
  onAdd,
}: AddExpenseSheetProps) {
  const isInstallment = mode === 'installment'
  const initialCount = isInstallment ? '12' : ''

  /*
    Compra parcelada NÃO passa pelo catálogo.

    O catálogo é de assinaturas — Netflix, Spotify, academia — e nenhuma delas é
    uma compra parcelada. Pior: ele carrega `suggestedCents`, um preço típico
    que faz sentido para uma assinatura e nenhum para uma viagem, um notebook ou
    uma reforma, onde o valor é a única coisa que a pessoa realmente sabe.
    Aqui o fluxo começa direto no formulário, com sugestões só de NOME.
  */
  const blankDraft = (): Draft | null =>
    mode === 'installment'
      ? { label: '', amountCents: ZERO, due: emptyDueRule, installments: '12' }
      : null

  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft | null>(blankDraft)
  const [expanded, setExpanded] = useState<string[]>([])
  const [scope, setScope] = useState<EditScope>('fromNowOn')

  const groups = useMemo(() => groupCatalog(searchCatalog(query)), [query])
  const trimmed = query.trim()
  const openGroups = trimmed === '' ? expanded : groups.map(([group]) => group)

  function pick(item: CatalogItem) {
    setDraft({
      label: item.name,
      amountCents: cents(item.suggestedCents),
      due: emptyDueRule,
      installments: initialCount,
    })
  }

  function close() {
    onOpenChange(false)
    setQuery('')
    setDraft(blankDraft())
    setScope('fromNowOn')
  }

  if (draft) {
    const count = Number(draft.installments)
    const validCount =
      !isInstallment ||
      (Number.isInteger(count) && count >= 1 && count <= MAX_INSTALLMENTS)

    /*
      Numa compra parcelada o campo de valor significa o TOTAL; o que vai para o
      plano é o mensal. O modelo guarda um único valor por mês, então a soma das
      parcelas pode ficar alguns centavos abaixo do total digitado — a prévia
      mostra o total resultante em vez de esconder a diferença.
    */
    const usable = isInstallment && validCount && count > 0
    const monthlyCents = usable
      ? installmentAmount(draft.amountCents, count)
      : draft.amountCents
    const plannedTotalCents = usable ? cents(monthlyCents * count) : ZERO
    const lastPeriod = usable ? installmentUntil(period, count) : null

    return (
      <Sheet open={open} onOpenChange={(next) => (next ? null : close())}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>
              {draft.label ||
                (isInstallment ? 'O que você parcelou?' : 'Nova conta')}
            </SheetTitle>
            <SheetDescription>
              {isInstallment
                ? 'Quanto custou no total e em quantas vezes.'
                : 'Confira o valor. Dá para ajustar depois.'}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="gap-6">
            {/* Vindo do catálogo o nome já está certo e o campo não aparece.
                Em compra parcelada ele está SEMPRE aberto: não houve catálogo,
                e a sugestão é só um ponto de partida para editar. */}
            {isInstallment || draft.label === '' ? (
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">
                    {isInstallment ? 'O que você comprou' : 'Nome da conta'}
                  </span>
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
                    placeholder={
                      isInstallment
                        ? 'Ex: viagem para o Chile'
                        : 'Ex: mensalidade do prédio'
                    }
                    className="border-input focus-visible:ring-ring h-12 rounded-lg border bg-transparent px-4 text-base outline-none focus-visible:ring-2"
                  />
                </label>

                {isInstallment ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {PURCHASE_SUGGESTIONS.map((item) => (
                      <Chip
                        key={item}
                        selected={draft.label === item}
                        onClick={() =>
                          setDraft((current) =>
                            current ? { ...current, label: item } : current,
                          )
                        }
                      >
                        {item}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  {isInstallment ? 'Valor total da compra' : 'Valor mensal'}
                </span>
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

            {/*
              Compra parcelada não é um tipo novo: é a mesma conta fixa com
              vigência fechada. A engine só materializa dentro da vigência,
              então a última parcela sai do plano sozinha.
            */}
            <div className="flex flex-col gap-3">
              {isInstallment ? (
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Em quantas vezes</span>
                  <input
                    inputMode="numeric"
                    value={draft.installments}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              installments: event.target.value.slice(0, 3),
                            }
                          : current,
                      )
                    }
                    aria-invalid={!validCount}
                    className="border-input focus-visible:ring-ring h-12 w-24 rounded-lg border bg-transparent px-4 text-base outline-none focus-visible:ring-2"
                  />
                  {validCount ? null : (
                    <p className="text-negative text-sm">
                      Use um número de 1 a {MAX_INSTALLMENTS}.
                    </p>
                  )}
                </label>
              ) : null}

              {usable && draft.amountCents > ZERO && lastPeriod ? (
                <div className="text-muted-foreground bg-muted flex flex-col gap-1 rounded-lg px-4 py-3 text-sm">
                  <p className="text-foreground font-medium">
                    {count}x de <MoneyValue cents={monthlyCents} size="sm" />
                  </p>
                  <p>última em {formatPeriod(lastPeriod)}</p>

                  {/* O centavo que sobra não some em silêncio. */}
                  {plannedTotalCents !== draft.amountCents ? (
                    <p className="text-balance">
                      No plano isso soma{' '}
                      <MoneyValue cents={plannedTotalCents} size="sm" /> — o
                      modelo guarda um valor mensal só, então a diferença de
                      centavos não cabe numa parcela maior.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/*
              A pergunta de escopo não aparece em compra parcelada: lá quem
              define a vigência é o número de parcelas, e as duas perguntas
              juntas se contradiriam.
            */}
            {!isInstallment ? (
              <ScopeField
                value={scope}
                onChange={setScope}
                legend="Essa conta vale a partir de quando?"
                fromNowOn={{
                  label: 'Deste mês em diante',
                  hint: 'Entra no plano todo mês, até você remover.',
                }}
                thisMonth={{
                  label: 'Só neste mês',
                  hint: 'Um gasto pontual; some do plano no mês que vem.',
                }}
              />
            ) : null}

            {/* Vencimento é OPCIONAL. Quem preenche ganha o lembrete na tela
                inicial; quem não preenche não é cobrado por isso. */}
            <DueRuleField
              value={draft.due}
              onChange={(due) =>
                setDraft((current) => (current ? { ...current, due } : current))
              }
            />

            {/* A ressalva é sobre o preço sugerido pelo catálogo — que só
                existe em assinatura. Em compra parcelada não há sugestão de
                valor, então a nota não teria a que se referir. */}
            {!isInstallment ? (
              <p className="text-muted-foreground bg-muted rounded-lg px-4 py-3 text-sm text-balance">
                O valor sugerido é só um ponto de partida — preço de assinatura
                muda e varia por plano. Coloque o que sai da sua conta.
              </p>
            ) : null}
          </SheetBody>

          <SheetFooter>
            <Button
              size="block"
              disabled={
                monthlyCents === ZERO ||
                draft.label.trim() === '' ||
                !isValidDueRule(draft.due) ||
                !validCount ||
                saving
              }
              onClick={() => {
                onAdd({
                  label: draft.label.trim(),
                  // Já é o mensal: o que a prévia mostrou é o que vai gravado.
                  amountCents: monthlyCents,
                  dueRule: toDueRule(draft.due),
                  installments: usable ? count : null,
                  scope: isInstallment ? 'fromNowOn' : scope,
                })
                close()
              }}
            >
              {saving ? 'Salvando…' : 'Adicionar'}
            </Button>
            {/* Não há para onde voltar em compra parcelada: o catálogo foi
                pulado, e este é o primeiro passo. */}
            {!isInstallment ? (
              <Button variant="quiet" onClick={() => setDraft(null)}>
                ← Escolher outro
              </Button>
            ) : null}
          </SheetFooter>
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

        <SheetBody>
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
                setDraft({
                  label: trimmed,
                  amountCents: ZERO,
                  due: emptyDueRule,
                  installments: '',
                })
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
                setDraft({
                  label: '',
                  amountCents: ZERO,
                  due: emptyDueRule,
                  installments: '',
                })
              }
              className="text-muted-foreground hover:text-foreground min-h-12 text-sm transition-colors"
            >
              Não achei o meu — quero digitar
            </button>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
