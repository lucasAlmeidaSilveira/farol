'use client'

import { useState } from 'react'

import type { Slice } from '@/components/home/allocation-bar'
import { BeaconCard } from '@/components/home/beacon-card'
import { CommitmentCard } from '@/components/home/commitment-card'
import { DuePanel } from '@/components/home/due-panel'
import { EmptyBeacon } from '@/components/home/empty-beacon'
import { MoneyValue } from '@/components/money/money-value'
import { InstallCard } from '@/components/shell/install-card'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BeaconSkeleton, Skeleton } from '@/components/ui/skeleton'
import { add, ZERO } from '@/domain/money'
import { calendarPeriodOf, todayIn } from '@/domain/period'
import type { DueItem } from '@/engine'
import type { MonthSummary } from '@/engine'
import { useCreateEntry } from '@/hooks/entries/use-create-entry'
import { useMonthSummary } from '@/hooks/summary/use-month-summary'
import { formatPeriod } from '@/lib/format'

/**
 * A tela HOJE. Um número domina tudo: quanto dá para gastar até o fim do mês.
 *
 * No desktop o conteúdo abre em duas colunas, com o número principal ocupando a
 * coluna larga e os detalhes ao lado — mas a HIERARQUIA não muda: o número
 * continua sendo a primeira coisa que se lê, em qualquer largura.
 *
 * Os quatro estados estão todos aqui, e a distinção que mais importa é esta:
 * "plano montado, zero lançamentos" NÃO é estado vazio — é o estado padrão de
 * sucesso, e é literalmente a promessa do produto.
 */
export function TodayScreen() {
  const [period] = useState(() =>
    calendarPeriodOf(todayIn('America/Sao_Paulo')),
  )

  const { summary, isPending, isError, error, needsOnboarding } =
    useMonthSummary(period)

  return (
    <PageContainer wide>
      <PageHeader
        title="Hoje"
        hint="Seu número do mês, atualizado a cada lançamento."
        aside={
          <span className="text-muted-foreground text-sm capitalize">
            {formatPeriod(period, { currentYear: new Date().getFullYear() })}
          </span>
        }
      />

      {isPending ? <LoadingState /> : null}
      {!isPending && isError ? <ErrorState message={error?.message} /> : null}
      {!isPending && !isError && needsOnboarding ? <EmptyBeacon /> : null}
      {!isPending && !isError && !needsOnboarding && summary ? (
        <LoadedState summary={summary} />
      ) : null}
    </PageContainer>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <BeaconSkeleton />
      </div>
      <div className="flex flex-col gap-6 lg:col-span-5">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  )
}

function ErrorState({ message }: { message?: string }) {
  return (
    <Card className="animate-rise items-center gap-4 py-12 text-center">
      <CardHeader className="w-full">
        <CardTitle className="text-lg">
          Não consegui carregar seu farol
        </CardTitle>
        <CardDescription className="text-balance">
          {message ?? 'Alguma coisa deu errado no caminho.'}
        </CardDescription>
      </CardHeader>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Tentar de novo
      </Button>
    </Card>
  )
}

function LoadedState({ summary }: { summary: MonthSummary }) {
  const create = useCreateEntry()

  /*
    "Paguei" registra uma QUITAÇÃO, não um gasto.

    A diferença importa: o valor do compromisso já foi reservado quando o mês
    foi calculado. Lançar como gasto o descontaria de novo e o número da home
    cairia duas vezes pela mesma conta.
  */
  const settle = (item: DueItem) => {
    void create.mutateAsync({
      kind: 'settlement',
      amountCents: item.outstandingCents,
      date: todayIn('America/Sao_Paulo'),
      description: item.name,
      commitmentId: item.commitmentId,
    })
  }

  const covenant = summary.commitments.find(
    (line) => line.type === 'proportional',
  )
  const fixedTotal = add(
    ...summary.commitments
      .filter((line) => line.type !== 'proportional')
      .map((line) => line.consideredCents),
  )

  const slices: Slice[] = [
    {
      id: 'covenant',
      label: covenant?.name ?? 'Proporcional',
      amountCents: covenant?.consideredCents ?? ZERO,
    },
    { id: 'fixed', label: 'Contas fixas', amountCents: fixedTotal },
    {
      id: 'spent',
      label: 'Gastos',
      amountCents: summary.totals.freeExpenseCents,
    },
    {
      id: 'free',
      label: 'Livre',
      amountCents: summary.totals.remainingToSpendCents,
    },
  ]

  const noEntriesYet =
    summary.totals.freeExpenseCents === ZERO &&
    summary.totals.receivedIncomeCents === ZERO

  return (
    <div className="stagger grid gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-7">
        <BeaconCard
          remainingCents={summary.totals.remainingToSpendCents}
          dailyPaceCents={summary.pace.dailyPaceCents}
          remainingDays={summary.pace.remainingDays}
          slices={slices}
          state={
            summary.totals.remainingToSpendCents < 0
              ? 'out'
              : summary.pace.status === 'ahead'
                ? 'dim'
                : 'lit'
          }
        />

        {noEntriesYet ? (
          <p className="text-muted-foreground bg-muted rounded-lg px-4 py-3 text-sm text-balance">
            Você ainda não lançou nada este mês. Tudo bem — o número acima já
            conta com suas contas fixas.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 lg:col-span-5">
        <DuePanel
          items={summary.due}
          onSettle={settle}
          settling={create.isPending}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Entrou este mês
            </CardTitle>
            <CardDescription>
              {summary.income.lines.length}{' '}
              {summary.income.lines.length === 1 ? 'fonte' : 'fontes'} de renda
            </CardDescription>
            <CardAction>
              <MoneyValue
                cents={summary.totals.consideredIncomeCents}
                size="lg"
                tone="positive"
              />
            </CardAction>
          </CardHeader>
        </Card>

        {covenant ? (
          <CommitmentCard
            name={covenant.name}
            totalCents={covenant.consideredCents}
            baseCents={covenant.baseCents}
            parts={covenant.parts}
            outstandingCents={covenant.outstandingCents}
            settledCents={covenant.settledCents}
          />
        ) : null}

        {/* Por último, e só para quem já voltou e já lançou algo. */}
        <InstallCard />
      </div>
    </div>
  )
}
