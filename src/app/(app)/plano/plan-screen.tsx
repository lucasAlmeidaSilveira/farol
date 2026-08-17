'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { MoneyValue } from '@/components/money/money-value'
import { AddExpenseSheet } from '@/components/plan/add-expense-sheet'
import { AddIncomeSheet } from '@/components/plan/add-income-sheet'
import { EditAmountSheet } from '@/components/plan/edit-amount-sheet'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { BasisPoints } from '@/domain/money'
import { add, type Cents, formatRate, ZERO } from '@/domain/money'
import { calendarPeriodOf, todayIn } from '@/domain/period'
import type { CommitmentId, IncomeSource } from '@/domain/types'
import type { CommitmentLine } from '@/engine'
import {
  type EditScope,
  useAddFixedBill,
  useAddIncomeSource,
  useEditFixedBill,
  useEditIncomeForecast,
  useRemoveCommitment,
} from '@/hooks/plan/use-edit-plan'
import { useIncomeSources } from '@/hooks/plan/use-plan'
import { useMonthSummary } from '@/hooks/summary/use-month-summary'
import { formatPeriod, spokenBRL } from '@/lib/format'

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
export function PlanScreen() {
  const [period] = useState(() =>
    calendarPeriodOf(todayIn('America/Sao_Paulo')),
  )

  const { summary, isPending, isError } = useMonthSummary(period)
  const { data: sources } = useIncomeSources()

  const editIncome = useEditIncomeForecast(period)
  const editBill = useEditFixedBill(period)
  const removeCommitment = useRemoveCommitment(period)
  const addBill = useAddFixedBill(period)
  const addIncome = useAddIncomeSource(period)

  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null)
  const [editingBill, setEditingBill] = useState<CommitmentLine | null>(null)
  const [addingBill, setAddingBill] = useState(false)
  const [addingIncome, setAddingIncome] = useState(false)

  if (isPending) return <PlanSkeleton />
  if (isError || !summary) return <PlanError />

  const proportional = summary.commitments.filter(
    (line) => line.type === 'proportional',
  )
  const bills = summary.commitments.filter(
    (line) => line.type === 'fixedAmount',
  )
  // Soma exatamente as linhas listadas abaixo dela: um subtotal que não bate
  // com o que está logo acima é pior do que subtotal nenhum.
  const billsTotal = add(...bills.map((line) => line.consideredCents))

  return (
    <>
      <PageContainer wide className="pb-52 lg:pb-10">
        <PageHeader
          title={`Plano de ${formatPeriod(period, { currentYear: new Date().getFullYear() })}`}
          hint="Editar aqui muda o seu número."
        />

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="stagger flex flex-col gap-8 lg:col-span-8">
            <Section title="Entra">
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
                  />
                )
              })}

              <AddRowButton onClick={() => setAddingIncome(true)}>
                Adicionar renda
              </AddRowButton>
            </Section>

            {proportional.length > 0 ? (
              <Section
                title="Sai antes"
                hint="Descontado da renda antes de qualquer gasto."
              >
                {proportional.map((line) => (
                  <Row
                    key={line.commitmentId}
                    label={line.name}
                    hint={`${formatRate(totalRate(line))} de tudo que entra`}
                    amountCents={line.consideredCents}
                    tone="covenant"
                    onRemove={() =>
                      void confirmRemove(
                        line.commitmentId,
                        line.name,
                        (scope) =>
                          removeCommitment.mutateAsync({
                            commitmentId: line.commitmentId,
                            scope,
                          }),
                      )
                    }
                  />
                ))}
              </Section>
            ) : null}

            <Section
              title="Contas fixas"
              total={bills.length > 0 ? billsTotal : undefined}
            >
              <AddRowButton onClick={() => setAddingBill(true)}>
                Adicionar conta
              </AddRowButton>
              {bills.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma conta fixa cadastrada ainda.
                </p>
              ) : (
                bills.map((line) => (
                  <Row
                    key={line.commitmentId}
                    label={line.name}
                    hint={dueHint(line.dueRule)}
                    amountCents={line.consideredCents}
                    onEdit={() => setEditingBill(line)}
                    onRemove={() =>
                      void confirmRemove(
                        line.commitmentId,
                        line.name,
                        (scope) =>
                          removeCommitment.mutateAsync({
                            commitmentId: line.commitmentId,
                            scope,
                          }),
                      )
                    }
                  />
                ))
              )}
            </Section>
          </div>

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

      <AddExpenseSheet
        open={addingBill}
        onOpenChange={setAddingBill}
        saving={addBill.isPending}
        onAdd={(bill) => void addBill.mutateAsync(bill)}
      />

      {editingSource ? (
        <EditAmountSheet
          open
          onOpenChange={(open) => !open && setEditingSource(null)}
          mode="income"
          initialName={editingSource.name}
          initialCents={editingSource.forecastCents}
          initialExpectedDay={editingSource.expectedDay}
          saving={editIncome.isPending}
          onSave={(changes, scope) => {
            void editIncome
              .mutateAsync({
                source: editingSource,
                name: changes.name,
                amountCents: changes.amountCents,
                expectedDay: changes.expectedDay,
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
          saving={editBill.isPending}
          onSave={(changes, scope) => {
            void editBill
              .mutateAsync({
                commitmentId: editingBill.commitmentId,
                name: changes.name,
                amountCents: changes.amountCents,
                dueRule: changes.dueRule,
                currentDueRule: editingBill.dueRule,
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
 * Remoção com escopo, via toast em vez de AlertDialog.
 *
 * Confirmação prévia é atrito em toda ação; desfazer é gentileza só quando o
 * erro acontece. Aqui a pergunta é necessária porque as duas opções fazem
 * coisas diferentes com o histórico — mas ela vive num toast, não num modal
 * que bloqueia a tela.
 */
function confirmRemove(
  commitmentId: CommitmentId,
  name: string,
  remove: (scope: EditScope) => Promise<void>,
) {
  return new Promise<void>((resolve) => {
    toast(`Remover ${name}?`, {
      duration: 10_000,
      action: {
        label: 'Só neste mês',
        onClick: () => void remove('thisMonth').then(resolve),
      },
      cancel: {
        label: 'De vez',
        onClick: () => void remove('fromNowOn').then(resolve),
      },
      description: '"De vez" também remove dos meses anteriores.',
    })
  })
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
      className="border-input text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-14 items-center justify-center gap-2 rounded-lg border border-dashed transition-colors duration-150"
    >
      <span aria-hidden="true">＋</span>
      {children}
    </button>
  )
}

/**
 * O subtotal fica no cabeçalho da seção, e não num card lateral, por uma razão
 * de alcance: o card `SlackSummary` é `lg:block`, some no celular, e a pessoa
 * que quer saber quanto pesam as contas fixas está justamente olhando a lista
 * delas. Aqui o número aparece nas duas larguras sem ramificação responsiva.
 */
function Section({
  title,
  hint,
  total,
  children,
}: {
  title: string
  hint?: string
  /** Omita quando a seção está vazia: "R$ 0,00" ao lado de "nada cadastrado". */
  total?: Cents
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-eyebrow text-muted-foreground uppercase">
            {title}
          </h2>
          {hint ? (
            <p className="text-muted-foreground text-xs">{hint}</p>
          ) : null}
        </div>

        {total !== undefined ? (
          <MoneyValue
            cents={total}
            size="sm"
            srLabel={`Total de ${title}: ${spokenBRL(total)}`}
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
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
  return (
    <div className="bg-card border-border flex items-center gap-3 rounded-lg border p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{label}</span>
        {hint ? (
          <span className="text-muted-foreground text-xs">{hint}</span>
        ) : null}
      </div>

      <span className="flex items-baseline gap-1">
        {/* O "≈" comunica sem palavras que o valor é um chute editável. */}
        {approximate ? (
          <span aria-hidden="true" className="text-muted-foreground text-sm">
            ≈
          </span>
        ) : null}
        <MoneyValue cents={amountCents} size="lg" tone={tone} />
      </span>

      {onEdit ? (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Editar ${label}`}
          onClick={onEdit}
          className="px-2"
        >
          <span aria-hidden="true">✎</span>
        </Button>
      ) : null}

      {onRemove ? (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remover ${label}`}
          onClick={onRemove}
          className="text-muted-foreground px-2"
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
    <div className="bg-card border-border animate-rise sticky top-9 flex flex-col gap-4 rounded-lg border p-5">
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
    </div>
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
