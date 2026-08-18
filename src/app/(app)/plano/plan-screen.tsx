'use client'

import { m } from 'motion/react'
import { useState } from 'react'

import { MoneyValue } from '@/components/money/money-value'
import { Reveal, StaggerItem } from '@/components/motion/reveal'
import { AddExpenseSheet } from '@/components/plan/add-expense-sheet'
import { AddIncomeSheet } from '@/components/plan/add-income-sheet'
import { EditAmountSheet } from '@/components/plan/edit-amount-sheet'
import { RemoveDialog } from '@/components/plan/remove-dialog'
import { usePlanSections } from '@/components/plan/use-plan-sections'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { installmentProgress } from '@/domain/installments'
import type { BasisPoints } from '@/domain/money'
import { add, type Cents, formatRate, ZERO } from '@/domain/money'
import { calendarPeriodOf, type Period, todayIn } from '@/domain/period'
import {
  type CommitmentId,
  expectedRuleOf,
  type IncomeSource,
  type IncomeSourceId,
} from '@/domain/types'
import type { CommitmentLine } from '@/engine'
import {
  useAddFixedBill,
  useAddIncomeSource,
  useEditFixedBill,
  useEditIncomeForecast,
  useRemoveCommitment,
  useRemoveIncomeSource,
} from '@/hooks/plan/use-edit-plan'
import { useIncomeSources } from '@/hooks/plan/use-plan'
import { useMonthSummary } from '@/hooks/summary/use-month-summary'
import { formatPeriod, spokenBRL } from '@/lib/format'

/** O acordeão do plano com variantes do Motion. Fora do render de propósito:
 *  criar o componente a cada renderização remontaria a árvore inteira. */
const StaggerAccordion = m.create(Accordion)

/**
 * A tela PLANO. É aqui que o produto vira um feedback loop.
 *
 * O rodapé fixo mostra a sobra recalculando a cada edição — sem isso, planejar
 * é preencher formulário; com isso, cada ajuste tem consequência visível na
 * hora, e a pessoa entende a própria situação mexendo nela.
 *
 * A ordem das seções não é estética: ENTRA, depois SAI ANTES, depois CONTAS.
 * Ela ensina o modelo mental do app — o compromisso proporcional é descontado
 * antes de qualquer gasto, e é por isso que a folga é menor do que o salário.
 */
/** O que está esperando confirmação de remoção. */
type Removal =
  | { kind: 'commitment'; id: CommitmentId; name: string }
  | { kind: 'income'; id: IncomeSourceId; name: string; isOnly: boolean }

export function PlanScreen() {
  const [period] = useState(() =>
    calendarPeriodOf(todayIn('America/Sao_Paulo')),
  )

  const { summary, input, isPending, isError } = useMonthSummary(period)
  const { data: sources } = useIncomeSources()

  const editIncome = useEditIncomeForecast(period)
  const editBill = useEditFixedBill(period)
  const removeCommitment = useRemoveCommitment(period)
  const removeIncome = useRemoveIncomeSource(period)
  const addBill = useAddFixedBill(period)
  const addIncome = useAddIncomeSource(period)

  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null)
  const [editingBill, setEditingBill] = useState<CommitmentLine | null>(null)
  /*
    O tipo do que se adiciona vem da SEÇÃO, não de um campo dentro do
    formulário: quem tocou "Adicionar parcelamento" já respondeu a pergunta.
  */
  const [adding, setAdding] = useState<'bill' | 'installment' | null>(null)
  const [removing, setRemoving] = useState<Removal | null>(null)
  const [addingIncome, setAddingIncome] = useState(false)
  const { open: openSections, change: setOpenSections } = usePlanSections()

  if (isPending) return <PlanSkeleton />
  if (isError || !summary) return <PlanError />

  const proportional = summary.commitments.filter(
    (line) => line.type === 'proportional',
  )
  const proportionalTotal = add(
    ...proportional.map((line) => line.consideredCents),
  )
  /*
    A vigência não vem na `CommitmentLine` — ela é derivada e a engine já
    resolveu se o mês entra ou não. Para distinguir "conta fixa" de "parcela"
    é preciso o compromisso cru, que o `useMonthSummary` já carrega e devolve
    em `input`. Nenhuma leitura extra no Firestore.
  */
  const rawById = new Map(
    (input?.commitments ?? []).map((commitment) => [commitment.id, commitment]),
  )

  const classify = (line: CommitmentLine) => {
    const raw = rawById.get(line.commitmentId)
    const until = raw?.recurrence.until ?? null
    if (!raw || until === null) return { oneOff: false, installment: null }

    const progress = installmentProgress(raw.recurrence, period)
    if (progress === null) return { oneOff: false, installment: null }

    /*
      Vigência de um mês só NÃO é parcelamento: é um gasto pontual, e chamá-lo
      de "parcela 1 de 1" o descreveria com o nome errado. Fica nas contas
      fixas, marcado como pontual.
    */
    if (progress.total === 1) return { oneOff: true, installment: null }

    return { oneOff: false, installment: { ...progress, until } }
  }

  const fixed = summary.commitments
    .filter((line) => line.type === 'fixedAmount')
    .map((line) => ({ line, ...classify(line) }))

  const bills = fixed.filter((item) => item.installment === null)
  const installments = fixed.filter((item) => item.installment !== null)

  /*
    A âncora da vigência é o mês da PRIMEIRA parcela, que não é o mês atual — é
    por isso que o sheet precisa do compromisso cru, e não só da linha.
  */
  const editingRaw = editingBill
    ? rawById.get(editingBill.commitmentId)
    : undefined
  const editingProgress = editingRaw
    ? installmentProgress(editingRaw.recurrence, period)
    : null
  const editingInstallment =
    // `> 1` pela mesma razão da classificação: gasto pontual não é parcelamento,
    // e o campo "Em quantas vezes" não faria sentido nele.
    editingRaw && editingProgress && editingProgress.total > 1
      ? {
          from: editingRaw.recurrence.from,
          count: editingProgress.total,
          index: editingProgress.index,
        }
      : null

  // Cada subtotal soma exatamente as linhas listadas abaixo dele: um subtotal
  // que não bate com o que está logo acima é pior do que subtotal nenhum.
  const billsTotal = add(...bills.map((item) => item.line.consideredCents))
  const installmentsTotal = add(
    ...installments.map((item) => item.line.consideredCents),
  )

  return (
    <>
      <PageContainer wide className="pb-52 lg:pb-10">
        <PageHeader
          title={`Plano de ${formatPeriod(period, { currentYear: new Date().getFullYear() })}`}
          hint="Editar aqui muda o seu número."
        />

        <div className="grid gap-8 lg:grid-cols-12">
          {/*
            O acordeão É o orquestrador da cascata: `m.create` transforma um
            componente que aceita `ref` numa peça do Motion, e as variantes
            descem dele para cada seção. A alternativa — calcular um atraso por
            índice — obrigaria cada seção a saber a posição dela na lista.
          */}
          <StaggerAccordion
            type="multiple"
            value={openSections}
            onValueChange={setOpenSections}
            className="flex flex-col gap-2 lg:col-span-8"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {/*
              Todas as seções carregam subtotal agora, e não só "Contas fixas":
              fechada sem número, a seção não responderia nada, e o colapso
              viraria perda pura.
            */}
            <Section
              id="entra"
              title="Entra"
              total={summary.totals.consideredIncomeCents}
            >
              {summary.income.lines.map((line) => {
                const source = sources?.find(
                  (item) => item.id === line.sourceId,
                )

                return (
                  <Row
                    key={line.sourceId ?? 'loose'}
                    label={line.name}
                    hint={
                      line.confidence === 'estimated'
                        ? 'valor estimado'
                        : line.kind === 'variable'
                          ? 'renda variável'
                          : undefined
                    }
                    amountCents={line.consideredCents}
                    tone="positive"
                    approximate={line.confidence === 'estimated'}
                    onEdit={source ? () => setEditingSource(source) : undefined}
                    onRemove={
                      source
                        ? () =>
                            setRemoving({
                              kind: 'income',
                              id: source.id,
                              name: line.name,
                              isOnly: summary.income.lines.length <= 1,
                            })
                        : undefined
                    }
                  />
                )
              })}

              <AddRowButton onClick={() => setAddingIncome(true)}>
                Adicionar renda
              </AddRowButton>
            </Section>

            {proportional.length > 0 ? (
              <Section
                id="sai-antes"
                title="Sai antes"
                hint="Descontado da renda antes de qualquer gasto."
                total={proportionalTotal}
              >
                {proportional.map((line) => (
                  <Row
                    key={line.commitmentId}
                    label={line.name}
                    hint={`${formatRate(totalRate(line))} de tudo que entra`}
                    amountCents={line.consideredCents}
                    tone="covenant"
                    onRemove={() =>
                      setRemoving({
                        kind: 'commitment',
                        id: line.commitmentId,
                        name: line.name,
                      })
                    }
                  />
                ))}
              </Section>
            ) : null}

            <Section id="contas" title="Contas fixas" total={billsTotal}>
              <AddRowButton onClick={() => setAdding('bill')}>
                Adicionar conta
              </AddRowButton>
              {bills.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma conta fixa cadastrada ainda.
                </p>
              ) : (
                bills.map(({ line, oneOff }) => (
                  <Row
                    key={line.commitmentId}
                    label={line.name}
                    hint={billHint(line.dueRule, oneOff, period)}
                    amountCents={line.consideredCents}
                    onEdit={() => setEditingBill(line)}
                    onRemove={() =>
                      setRemoving({
                        kind: 'commitment',
                        id: line.commitmentId,
                        name: line.name,
                      })
                    }
                  />
                ))
              )}
            </Section>

            {/*
              Parcela tem seção própria porque ela responde a outra pergunta.
              Conta fixa é "quanto sai todo mês, para sempre"; parcela é "quanto
              falta até acabar" — e ver que acaba é justamente o alívio que uma
              compra parcelada precisa dar.
            */}
            <Section
              id="parcelas"
              title="Parcelas"
              hint="Saem do plano sozinhas quando a última for paga."
              total={installments.length > 0 ? installmentsTotal : undefined}
            >
              <AddRowButton onClick={() => setAdding('installment')}>
                Adicionar parcelamento
              </AddRowButton>

              {installments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma compra parcelada cadastrada.
                </p>
              ) : null}

              {installments.map(({ line, installment }) => (
                <Row
                  key={line.commitmentId}
                  label={line.name}
                  hint={
                    installment
                      ? `parcela ${installment.index} de ${installment.total} · última em ${formatPeriod(
                          installment.until,
                          { currentYear: new Date().getFullYear() },
                        )}`
                      : undefined
                  }
                  amountCents={line.consideredCents}
                  onEdit={() => setEditingBill(line)}
                  onRemove={() =>
                    setRemoving({
                      kind: 'commitment',
                      id: line.commitmentId,
                      name: line.name,
                    })
                  }
                />
              ))}
            </Section>
          </StaggerAccordion>

          {/* No desktop o resumo vira um card que acompanha a rolagem, ao lado
              das seções. No celular ele volta a ser a barra fixa do rodapé —
              onde o polegar alcança. */}
          <aside className="hidden lg:col-span-4 lg:block">
            <SlackSummary
              availableCents={summary.totals.availableToSpendCents}
              incomeCents={summary.totals.consideredIncomeCents}
              commitmentCents={summary.totals.consideredCommitmentCents}
            />
          </aside>
        </div>
      </PageContainer>

      <SlackFooter availableCents={summary.totals.availableToSpendCents} />

      <AddIncomeSheet
        open={addingIncome}
        onOpenChange={setAddingIncome}
        saving={addIncome.isPending}
        onAdd={(income) => void addIncome.mutateAsync(income)}
      />

      <RemoveDialog
        name={removing?.name ?? null}
        foreverBlockedBy={
          removing?.kind === 'income' && removing.isOnly
            ? 'É a sua única renda: sem nenhuma, o app volta a pedir o plano do zero. Cadastre outra antes de remover de vez.'
            : undefined
        }
        onOpenChange={(open) => !open && setRemoving(null)}
        onConfirm={(scope) => {
          if (!removing) return

          if (removing.kind === 'commitment') {
            void removeCommitment.mutateAsync({
              commitmentId: removing.id,
              scope,
            })
          } else {
            void removeIncome.mutateAsync({ sourceId: removing.id, scope })
          }

          setRemoving(null)
        }}
      />

      {adding ? (
        <AddExpenseSheet
          open
          onOpenChange={(open) => !open && setAdding(null)}
          saving={addBill.isPending}
          period={period}
          mode={adding}
          onAdd={(bill) => void addBill.mutateAsync(bill)}
        />
      ) : null}

      {editingSource ? (
        <EditAmountSheet
          open
          onOpenChange={(open) => !open && setEditingSource(null)}
          mode="income"
          initialName={editingSource.name}
          initialCents={editingSource.forecastCents}
          initialExpectedRule={expectedRuleOf(editingSource)}
          saving={editIncome.isPending}
          onSave={(changes, scope) => {
            void editIncome
              .mutateAsync({
                source: editingSource,
                name: changes.name,
                amountCents: changes.amountCents,
                expectedRule: changes.expectedRule,
                scope,
              })
              .then(() => setEditingSource(null))
          }}
        />
      ) : null}

      {editingBill ? (
        <EditAmountSheet
          open
          onOpenChange={(open) => !open && setEditingBill(null)}
          mode="bill"
          initialName={editingBill.name}
          initialCents={editingBill.consideredCents}
          initialDueRule={editingBill.dueRule}
          installment={editingInstallment}
          saving={editBill.isPending}
          onSave={(changes, scope) => {
            void editBill
              .mutateAsync({
                commitmentId: editingBill.commitmentId,
                name: changes.name,
                amountCents: changes.amountCents,
                dueRule: changes.dueRule,
                currentDueRule: editingBill.dueRule,
                recurrence: changes.recurrence,
                scope,
              })
              .then(() => setEditingBill(null))
          }}
        />
      ) : null}
    </>
  )
}

/**
 * A dica de uma conta fixa: vencimento e, quando pontual, o mês em que acaba.
 *
 * "todo dia 10" sozinho mentiria numa conta de um mês só — sugere repetição
 * onde não há.
 */
function billHint(
  rule: CommitmentLine['dueRule'],
  oneOff: boolean,
  period: Period,
): string | undefined {
  const parts = [
    dueHint(rule),
    oneOff
      ? `só em ${formatPeriod(period, { currentYear: new Date().getFullYear() })}`
      : undefined,
  ].filter((part): part is string => part !== undefined)

  return parts.length > 0 ? parts.join(' · ') : undefined
}

/** "todo dia 10" ou "5º dia útil". */
function dueHint(rule: CommitmentLine['dueRule']): string | undefined {
  if (rule === null) return undefined
  return rule.type === 'dayOfMonth'
    ? `todo dia ${rule.day}`
    : `${rule.n}º dia útil`
}

const totalRate = (line: CommitmentLine): BasisPoints =>
  line.parts.reduce((sum, part) => sum + part.rateBp, 0) as BasisPoints

// ------------------------------------------------------------- componentes

/** O botão de adicionar que fecha cada seção do plano. */
function AddRowButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-input text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex min-h-11 items-center justify-center gap-2 rounded-lg border border-dashed text-sm transition-colors duration-150 outline-none focus-visible:ring-[3px]"
    >
      <span aria-hidden="true">＋</span>
      {children}
    </button>
  )
}

/**
 * Uma seção do plano, colapsável, com o subtotal no cabeçalho.
 *
 * O subtotal é o que torna o colapso ganho e não perda: fechada, a seção
 * continua respondendo "quanto pesa isto"; aberta, responde "composto de quê".
 * Fechada por padrão, a tela mostra a equação inteira de uma vez — entra, sai
 * antes, contas, parcelas — que antes exigia três telas de rolagem.
 *
 * E é por isso que o subtotal vive aqui, e não só no card lateral: o
 * `SlackSummary` é `lg:block` e some no celular.
 */
function Section({
  id,
  title,
  hint,
  total,
  children,
}: {
  /** Chave do estado persistido de aberto/fechado. */
  id: string
  title: string
  hint?: string
  /** Omita quando a seção está vazia: "R$ 0,00" ao lado de "nada cadastrado". */
  total?: Cents
  children: React.ReactNode
}) {
  return (
    <StaggerItem>
      <AccordionItem
        value={id}
        className="bg-card border-border rounded-lg border px-4"
      >
        {/* `hover:no-underline` porque o sublinhado padrão pegaria o subtotal
          junto, e número sublinhado parece link quebrado. */}
        <AccordionTrigger className="py-3.5 hover:no-underline">
          <div className="flex flex-1 items-baseline justify-between gap-3">
            <span className="flex min-w-0 flex-col gap-0.5 text-left">
              <span className="text-eyebrow text-muted-foreground uppercase">
                {title}
              </span>
              {hint ? (
                <span className="text-muted-foreground text-xs font-normal">
                  {hint}
                </span>
              ) : null}
            </span>

            {total !== undefined ? (
              <MoneyValue
                cents={total}
                size="sm"
                srLabel={`Total de ${title}: ${spokenBRL(total)}`}
              />
            ) : null}
          </div>
        </AccordionTrigger>

        <AccordionContent className="pt-1 pb-4">
          <div className="flex flex-col gap-2">{children}</div>
        </AccordionContent>
      </AccordionItem>
    </StaggerItem>
  )
}

function Row({
  label,
  hint,
  amountCents,
  tone = 'default',
  approximate = false,
  onEdit,
  onRemove,
}: {
  label: string
  hint?: string
  amountCents: Cents
  tone?: 'default' | 'positive' | 'covenant'
  approximate?: boolean
  onEdit?: () => void
  onRemove?: () => void
}) {
  /*
    Rótulo e dica na MESMA linha, e a linha inteira é o alvo de edição.

    Empilhar os dois e ainda colocar um lápis de 44px ao lado custava ~76px por
    item; com 13 itens, três telas de rolagem. Aqui a altura é a do próprio alvo
    de toque, e editar continua a UM toque — em qualquer ponto da linha, um alvo
    muito maior do que o ícone que ele substitui.

    Não virou menu "⋮" de propósito: com duas ações só, e remover já protegido
    pelo diálogo de confirmação, o menu cobraria um clique sem comprar
    segurança.
  */
  const content = (
    <>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate font-medium">{label}</span>
        {hint ? (
          <span className="text-muted-foreground truncate text-xs">{hint}</span>
        ) : null}
      </span>

      <span className="flex shrink-0 items-baseline gap-1">
        {/* O "≈" comunica sem palavras que o valor é um chute editável. */}
        {approximate ? (
          <span aria-hidden="true" className="text-muted-foreground text-sm">
            ≈
          </span>
        ) : null}
        <MoneyValue cents={amountCents} tone={tone} />
      </span>
    </>
  )

  return (
    <div className="bg-card border-border flex items-center rounded-lg border pr-1 pl-3">
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${label}`}
          className="focus-visible:ring-ring flex min-h-11 flex-1 items-center gap-3 rounded-md py-1.5 text-left outline-none focus-visible:ring-[3px]"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-h-11 flex-1 items-center gap-3 py-1.5">
          {content}
        </div>
      )}

      {onRemove ? (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remover ${label}`}
          onClick={onRemove}
          className="text-muted-foreground shrink-0 px-2"
        >
          <span aria-hidden="true">×</span>
        </Button>
      ) : null}
    </div>
  )
}

/** O resumo do desktop: mesma informação do rodapé, com a conta aberta. */
function SlackSummary({
  availableCents,
  incomeCents,
  commitmentCents,
}: {
  availableCents: Cents
  incomeCents: Cents
  commitmentCents: Cents
}) {
  return (
    <Reveal
      onMount
      className="bg-card border-border sticky top-9 flex flex-col gap-4 rounded-lg border p-5"
    >
      <h2 className="text-eyebrow text-muted-foreground uppercase">
        Sobra livre
      </h2>

      <MoneyValue
        cents={availableCents}
        size="xl"
        tone={availableCents < ZERO ? 'negative' : 'positive'}
      />

      <dl className="border-border flex flex-col gap-1.5 border-t pt-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Entra</dt>
          <dd>
            <MoneyValue cents={incomeCents} size="sm" />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Sai antes</dt>
          <dd>
            <MoneyValue cents={commitmentCents} size="sm" tone="muted" />
          </dd>
        </div>
      </dl>

      <p className="text-muted-foreground text-xs text-balance">
        Este número muda enquanto você edita, para você ver a consequência de
        cada ajuste na hora.
      </p>
    </Reveal>
  )
}

/** O rodapé que transforma planejar num feedback loop, no celular. */
function SlackFooter({ availableCents }: { availableCents: Cents }) {
  return (
    <div className="bg-card/95 border-border fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t backdrop-blur lg:hidden">
      <div className="mx-auto flex w-full max-w-lg items-baseline justify-between gap-3 px-5 py-3 sm:px-6">
        <span className="text-sm font-medium">Sobra livre</span>
        <MoneyValue
          cents={availableCents}
          size="xl"
          tone={availableCents < ZERO ? 'negative' : 'positive'}
        />
      </div>
    </div>
  )
}

function PlanSkeleton() {
  return (
    <PageContainer wide>
      <Skeleton className="h-9 w-56" />
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ))}
    </PageContainer>
  )
}

function PlanError() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <h1 className="text-lg font-semibold">
          Não consegui carregar seu plano
        </h1>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar de novo
        </Button>
      </div>
    </PageContainer>
  )
}
