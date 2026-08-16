'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { MoneyValue } from '@/components/money/money-value'
import { PageContainer, PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Cents } from '@/domain/money'
import {
  calendarPeriodOf,
  cycleFor,
  type LocalDate,
  todayIn,
} from '@/domain/period'
import type { Entry, EntryId } from '@/domain/types'
import type { CommitmentLine, MonthSummary } from '@/engine'
import { useDeleteEntry } from '@/hooks/entries/use-create-entry'
import { useMonthEntries } from '@/hooks/entries/use-month-entries'
import { useMonthSummary } from '@/hooks/summary/use-month-summary'
import { formatDate, formatPeriod } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * A tela MÊS.
 *
 * A decisão de produto aqui é que ela NUNCA fica em branco. Mesmo sem nenhum
 * lançamento, a timeline já vem populada com o que o plano espera que aconteça:
 * o salário no dia 5, o aluguel no dia 10, a Comunhão de Bens.
 *
 * Isso transforma um estado vazio numa PRÉVIA do mês — e ensina o modelo mental
 * do app sem tutorial nenhum. A pessoa entende que o Farol já sabe o que vai
 * acontecer, e que lançar serve para refinar, não para alimentar.
 */
export function MonthScreen() {
  const [period] = useState(() =>
    calendarPeriodOf(todayIn('America/Sao_Paulo')),
  )
  const today = todayIn('America/Sao_Paulo')

  const { summary, isPending, isError } = useMonthSummary(period)
  const { data: month } = useMonthEntries(period)
  const remove = useDeleteEntry()

  const days = useMemo(() => (month ? groupByDay(month.entries) : []), [month])

  const upcoming = useMemo(
    () => (summary ? forecastRows(summary, today) : []),
    [summary, today],
  )

  if (isPending) return <MonthSkeleton />
  if (isError || !summary) return <MonthError />

  return (
    <PageContainer wide>
      <PageHeader
        title={formatPeriod(period, { currentYear: new Date().getFullYear() })}
        hint="Tudo que aconteceu e o que ainda está previsto."
        className="capitalize"
        aside={
          <span className="flex flex-wrap gap-x-4 text-sm normal-case">
            <span className="text-muted-foreground">
              Entrou{' '}
              <MoneyValue
                cents={summary.totals.receivedIncomeCents}
                size="sm"
                tone="positive"
              />
            </span>
            <span className="text-muted-foreground">
              Saiu{' '}
              <MoneyValue
                cents={summary.totals.freeExpenseCents}
                size="sm"
                tone="muted"
              />
            </span>
          </span>
        }
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          {days.length === 0 ? (
            <p className="text-muted-foreground bg-muted rounded-lg px-4 py-3 text-sm text-balance">
              Nada lançado ainda neste mês. Abaixo está o que o seu plano espera
              que aconteça.
            </p>
          ) : null}

          <ol className="stagger flex flex-col gap-6">
            {days.map(([date, entries]) => (
              <li key={date} className="flex flex-col gap-2">
                <h2 className="text-eyebrow text-muted-foreground uppercase">
                  {date === today ? 'Hoje' : formatDate(date)}
                </h2>

                <ul className="flex flex-col gap-1.5">
                  {entries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      pending={month?.pendingIds.includes(entry.id) ?? false}
                      onDelete={() => askDelete(entry, remove.mutateAsync)}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>

        {upcoming.length > 0 ? (
          <section className="flex flex-col gap-3 lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="border-border flex-1 border-t border-dashed" />
              <span className="text-muted-foreground text-xs">previsto</span>
              <span className="border-border flex-1 border-t border-dashed" />
            </div>

            <ul className="flex flex-col gap-1.5">
              {upcoming.map((row) => (
                <li
                  key={row.id}
                  className="border-border flex items-center gap-3 rounded-lg border border-dashed p-3 opacity-70"
                >
                  <span aria-hidden="true" className="text-muted-foreground">
                    ⌁
                  </span>
                  <span className="flex-1 truncate text-sm">{row.label}</span>
                  <MoneyValue cents={row.amountCents} size="sm" tone="muted" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </PageContainer>
  )
}

// ------------------------------------------------------------------ linhas

function EntryRow({
  entry,
  pending,
  onDelete,
}: {
  entry: Entry
  pending: boolean
  onDelete: () => void
}) {
  const income = entry.kind === 'income'

  return (
    <li className="bg-card border-border flex items-center gap-3 rounded-lg border p-3">
      {/* Direção por FORMA, não só por cor: sobrevive ao daltonismo e ao teste
          em escala de cinza. */}
      <span
        aria-hidden="true"
        className={cn(
          'text-sm',
          income ? 'text-positive' : 'text-muted-foreground',
        )}
      >
        {income ? '↙' : '↗'}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {entry.description || (income ? 'Entrada' : 'Gasto')}
        </span>
        <span className="text-muted-foreground text-xs">
          {income
            ? 'entrou'
            : entry.kind === 'settlement'
              ? 'quitação'
              : 'saiu'}
          {pending ? ' · salvo offline' : ''}
        </span>
      </span>

      {pending ? (
        <span
          aria-label="Aguardando sincronizar"
          className="text-muted-foreground text-xs"
        >
          ⟳
        </span>
      ) : null}

      <MoneyValue
        cents={entry.amountCents}

        sign="always"
        tone={income ? 'positive' : 'default'}
        className={income ? undefined : 'font-medium'}
      />

      <Button
        variant="ghost"
        size="sm"
        aria-label={`Apagar ${entry.description || 'lançamento'}`}
        onClick={onDelete}
        className="text-muted-foreground px-2"
      >
        <span aria-hidden="true">×</span>
      </Button>
    </li>
  )
}

/**
 * Apagar não pede confirmação: pede desculpa.
 *
 * Confirmar antes é atrito em toda ação, inclusive nas certas. Desfazer depois
 * cobra o custo só de quem errou — e num app usado no caixa do mercado, com uma
 * mão só, isso faz diferença real.
 */
function askDelete(entry: Entry, remove: (id: EntryId) => Promise<void>) {
  void remove(entry.id)

  toast(`${entry.description || 'Lançamento'} apagado`, {
    action: {
      label: 'Desfazer',
      // O undo real recria o lançamento; por ora o toast já evita o susto de
      // apagar sem aviso, e a recriação entra junto com o histórico de edição.
      onClick: () => toast.info('Recriação de lançamento ainda não disponível'),
    },
  })
}

/** "(dia 10)" ou "(5º dia útil)" — só quando há regra de vencimento. */
function dueHint(rule: CommitmentLine['dueRule']): string {
  if (rule === null) return ''
  return rule.type === 'dayOfMonth'
    ? ` (dia ${rule.day})`
    : ` (${rule.n}º dia útil)`
}

// ---------------------------------------------------------------- helpers

function groupByDay(entries: readonly Entry[]): [LocalDate, Entry[]][] {
  const byDay = new Map<LocalDate, Entry[]>()

  for (const entry of entries) {
    const bucket = byDay.get(entry.date)
    if (bucket) bucket.push(entry)
    else byDay.set(entry.date, [entry])
  }

  // Timeline invertida: o mais recente primeiro, que é o que a pessoa procura.
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? 1 : -1))
}

type ForecastRow = { id: string; label: string; amountCents: Cents }

/**
 * O que o plano espera e ainda não aconteceu.
 *
 * É o que impede a tela de ficar em branco — e o que faz o vazio virar uma
 * prévia do mês em vez de uma cobrança.
 */
function forecastRows(summary: MonthSummary, today: LocalDate): ForecastRow[] {
  const cycle = cycleFor(summary.period, {
    type: 'dayOfMonth',
    day: Number(summary.cycle.start.slice(8, 10)),
  })

  const cycleEnded = today > cycle.end

  const pendingIncome = summary.income.lines
    .filter((line) => line.receivedCents === 0 && line.forecastCents > 0)
    .map((line) => ({
      id: `income-${line.sourceId ?? 'loose'}`,
      label: `${line.name} (previsto)`,
      amountCents: line.forecastCents,
    }))

  const pendingCommitments = summary.commitments
    .filter((line) => line.outstandingCents > 0)
    .map((line) => ({
      id: `commitment-${line.commitmentId}`,
      label: `${line.name}${dueHint(line.dueRule)}`,
      amountCents: line.outstandingCents,
    }))

  return cycleEnded ? [] : [...pendingIncome, ...pendingCommitments]
}

// ------------------------------------------------------------------ estados

function MonthSkeleton() {
  return (
    <PageContainer wide>
      <Skeleton className="h-9 w-48" />
      {[0, 1].map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </PageContainer>
  )
}

function MonthError() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <h1 className="text-lg font-semibold">Não consegui carregar o mês</h1>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar de novo
        </Button>
      </div>
    </PageContainer>
  )
}
