'use client'

import { useState } from 'react'

import { BeaconCard } from '@/components/home/beacon-card'
import { beaconViewOf, proportionalLineOf } from '@/components/home/beacon-view'
import { CommitmentCard } from '@/components/home/commitment-card'
import { DuePanel } from '@/components/home/due-panel'
import { EmptyBeacon } from '@/components/home/empty-beacon'
import { IncomeCard } from '@/components/home/income-card'
import { PaceCard } from '@/components/home/pace-card'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { InstallCard } from '@/components/shell/install-card'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BeaconSkeleton, Skeleton } from '@/components/ui/skeleton'
import { ZERO } from '@/domain/money'
import { calendarPeriodOf, todayIn } from '@/domain/period'
import type { IncomeSource } from '@/domain/types'
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

  const { summary, input, isPending, isError, error, needsOnboarding } =
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
        <LoadedState summary={summary} sources={input?.incomeSources} />
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
    <Card className="items-center gap-4 py-12 text-center">
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

function LoadedState({
  summary,
  sources,
}: {
  summary: MonthSummary
  /* Já vêm do `useMonthSummary`: nenhuma leitura extra no Firestore. */
  sources?: readonly IncomeSource[]
}) {
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

  const covenant = proportionalLineOf(summary)

  const noEntriesYet =
    summary.totals.freeExpenseCents === ZERO &&
    summary.totals.receivedIncomeCents === ZERO

  return (
    <Stagger className="grid gap-6 lg:grid-cols-12">
      <StaggerItem className="flex flex-col gap-6 lg:col-span-7">
        {/* A tradução resumo -> props mora em `beaconViewOf` porque a landing
            mostra este mesmo card com um exemplo, e as duas não podem
            divergir. */}
        <BeaconCard {...beaconViewOf(summary)} />

        {noEntriesYet ? (
          <p className="text-muted-foreground bg-muted rounded-lg px-4 py-3 text-sm text-balance">
            Você ainda não lançou nada este mês. Tudo bem — o número acima já
            conta com suas contas fixas.
          </p>
        ) : null}

        {/*
          O ritmo só aparece depois do primeiro gasto, e é de propósito: sem
          nada lançado ele diria "neste ritmo o mês fecha em R$ 0,00", que é
          verdade e não serve para nada. A nota acima já cobre esse estado.

          Aqui embaixo do número porque é a elaboração dele: o valor grande diz
          QUANTO sobra, o ritmo diz SE vai sobrar. Trocar a ordem faria a tela
          responder a segunda pergunta antes da primeira.
        */}
        {!noEntriesYet && summary.totals.freeExpenseCents > ZERO ? (
          <PaceCard
            pace={summary.pace}
            availableCents={summary.totals.availableToSpendCents}
            spentCents={summary.totals.freeExpenseCents}
          />
        ) : null}
      </StaggerItem>

      <StaggerItem className="flex flex-col gap-6 lg:col-span-5">
        <DuePanel
          items={summary.due}
          onSettle={settle}
          settling={create.isPending}
        />

        <IncomeCard
          lines={summary.income.lines}
          totalCents={summary.totals.consideredIncomeCents}
          cycle={summary.cycle}
          sources={sources}
        />

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
      </StaggerItem>
    </Stagger>
  )
}
