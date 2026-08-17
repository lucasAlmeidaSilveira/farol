'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { FarolMark } from '@/components/brand/farol-mark'
import { MoneyValue } from '@/components/money/money-value'
import { AccountMenu } from '@/components/shared/account-menu'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { errorMessage } from '@/data/session'
import { type Cents, cents, negate, ZERO } from '@/domain/money'
import { useIncomeSources } from '@/hooks/plan/use-plan'
import { useSaveOnboarding } from '@/hooks/plan/use-save-onboarding'
import { formatDays } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSession } from '@/providers/auth-provider'

import { EMPTY_STATE, type OnboardingState, previewSummary } from './preview'
import {
  BillsStep,
  CovenantStep,
  IncomeStep,
  VariableIncomeStep,
} from './steps'

/**
 * O onboarding. Meta dura: chegar ao "aha" em menos de 2 minutos, com alguém
 * que não sabe de cabeça nenhum dos próprios números.
 *
 * Três decisões fazem isso funcionar:
 *
 * 1. Nenhum passo pede digitação — tudo é seleção, com um atalho para quem
 *    quer precisão.
 * 2. A prévia viva no rodapé recalcula a cada toque. O "aha" não acontece no
 *    fim: ele CRESCE durante o fluxo, e por isso a pessoa quer continuar.
 * 3. Nada é obrigatório. Um número estimado é infinitamente melhor que nenhum,
 *    e abandonar no passo 3 ainda deixa o app funcionando.
 */

const STEPS = ['income', 'variable', 'covenant', 'bills', 'reveal'] as const
type Step = (typeof STEPS)[number]

export function OnboardingFlow() {
  const router = useRouter()
  const { user } = useSession()
  const save = useSaveOnboarding()
  const { data: sources } = useIncomeSources()

  /*
    Refazer o onboarding com o plano já montado DUPLICARIA tudo.

    `useSaveOnboarding` grava com id gerado pelo Firestore, então ele sempre
    cria — nunca atualiza. Chegar aqui pela URL, por um atalho antigo do PWA ou
    pelo histórico sairia com duas rendas e duas Comunhões de Bens, e o número
    da home dobraria sem explicação.
  */
  useEffect(() => {
    if (sources && sources.length > 0) router.replace('/')
  }, [sources, router])

  const [step, setStep] = useState<Step>('income')
  const [state, setState] = useState<OnboardingState>(() => ({
    ...EMPTY_STATE,
    name: user?.displayName?.split(' ')[0] ?? '',
  }))

  const summary = useMemo(() => previewSummary(state), [state])
  const index = STEPS.indexOf(step)
  const isReveal = step === 'reveal'

  const patch = (next: Partial<OnboardingState>) =>
    setState((current) => ({ ...current, ...next }))

  const goNext = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]!)
  const goBack = () => setStep(STEPS[Math.max(index - 1, 0)]!)

  async function finish() {
    try {
      await save.mutateAsync({
        incomeCents: state.incomeCents,
        incomeConfidence: state.incomeConfidence,
        incomeDay: null,
        withCovenant: state.withCovenant,
        // Gasto sem nome ou sem valor é linha que a pessoa começou e não
        // terminou — salvar geraria um item inútil no plano, e as rules
        // recusariam o nome vazio de qualquer forma.
        bills: state.bills
          .filter((bill) => bill.label.trim() !== '' && bill.amountCents > 0)
          .map((bill) => ({
            label: bill.label.trim(),
            amountCents: bill.amountCents,
            dueDay: null,
          })),
      })
      router.replace('/')
    } catch (caught) {
      toast.error(errorMessage(caught))
    }
  }

  if (isReveal) {
    return (
      <RevealStep
        name={state.name}
        summary={summary}
        saving={save.isPending}
        onFinish={() => void finish()}
        onAdjust={() => setStep('income')}
      />
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-4 pb-32 sm:px-6">
      <header className="flex flex-col gap-3 pb-8">
        <div className="flex items-center justify-between gap-3">
          {/*
            No primeiro passo o ‹ leva de volta ao app, em vez de ficar morto.

            "Nada é obrigatório" só vale se der para desistir: o botão desabilitado
            transformava entrar no onboarding numa viagem só de ida — a única saída
            era terminar o fluxo ou sair da conta.
          */}
          <button
            type="button"
            onClick={index === 0 ? () => router.push('/') : goBack}
            aria-label={index === 0 ? 'Voltar para o início' : 'Voltar'}
            className="text-muted-foreground"
          >
            ‹
          </button>
          <span className="text-muted-foreground text-sm">
            {index + 1} de {STEPS.length - 1}
          </span>
          {/*
            A conta precisa ter saída AQUI.

            Quem acabou de entrar com a conta errada fica preso: o onboarding
            não monta a casca do app, então não há barra lateral, navegação nem
            Ajustes — e sair só existia lá dentro, depois de terminar o fluxo.
          */}
          <AccountMenu compact withSettings={false} />
        </div>

        <Progress
          value={((index + 1) / (STEPS.length - 1)) * 100}
          aria-label={`Passo ${index + 1} de ${STEPS.length - 1}`}
          className="h-1.5"
        />
      </header>

      {step === 'income' ? <IncomeStep value={state} onChange={patch} /> : null}
      {step === 'variable' ? (
        <VariableIncomeStep value={state} onChange={patch} />
      ) : null}
      {step === 'covenant' ? (
        <CovenantStep value={state} onChange={patch} />
      ) : null}
      {step === 'bills' ? <BillsStep value={state} onChange={patch} /> : null}

      <LivePreview
        remainingCents={summary.totals.availableToSpendCents}
        show={state.incomeCents > ZERO}
        onNext={goNext}
        nextLabel={step === 'bills' ? 'Ver o resultado' : 'Continuar'}
        canAdvance={step !== 'income' || state.incomeCents > ZERO}
      />
    </main>
  )
}

/** A barra fixa que faz o "aha" crescer durante o fluxo, não só no fim. */
function LivePreview({
  remainingCents,
  show,
  onNext,
  nextLabel,
  canAdvance,
}: {
  remainingCents: Cents
  show: boolean
  onNext: () => void
  nextLabel: string
  canAdvance: boolean
}) {
  return (
    <div className="bg-background/95 border-border fixed inset-x-0 bottom-0 border-t backdrop-blur">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        {show ? (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground text-sm">Sobrando</span>
            <span className="flex items-baseline gap-1">
              <span aria-hidden="true" className="text-muted-foreground">
                ≈
              </span>
              <MoneyValue
                cents={remainingCents}
                size="lg"
                tone={remainingCents < 0 ? 'negative' : 'positive'}
                hideCentsWhenZero
              />
            </span>
          </div>
        ) : null}

        <Button size="block" onClick={onNext} disabled={!canAdvance}>
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}

function RevealStep({
  name,
  summary,
  saving,
  onFinish,
  onAdjust,
}: {
  name: string
  summary: ReturnType<typeof previewSummary>
  saving: boolean
  onFinish: () => void
  onAdjust: () => void
}) {
  const covenant = summary.commitments.find(
    (line) => line.type === 'proportional',
  )
  const bills = summary.commitments.filter(
    (line) => line.type === 'fixedAmount',
  )
  const billsTotal = bills.reduce<number>(
    (sum, line) => sum + line.consideredCents,
    0,
  )

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10 sm:px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <FarolMark size={64} withHorizon />

        <div className="flex flex-col gap-3">
          <p className="text-lg">Pronto{name ? `, ${name}` : ''}.</p>
          <p className="text-muted-foreground">Você tem livres</p>
          <MoneyValue
            cents={summary.totals.availableToSpendCents}
            size="hero"
            tone={
              summary.totals.availableToSpendCents < 0 ? 'negative' : 'default'
            }
          />
          <p className="text-muted-foreground text-balance">
            este mês. Dá{' '}
            <MoneyValue
              cents={summary.pace.dailyPaceCents ?? ZERO}
              size="sm"
              hideCentsWhenZero
            />{' '}
            por dia nos {formatDays(summary.pace.remainingDays)} que faltam.
          </p>
        </div>
      </div>

      {/* A conta aberta. Para quem não confia no próprio controle financeiro,
          ver a conta é o que transforma um número numa informação confiável. */}
      <dl className="bg-card border-border flex flex-col gap-2 rounded-lg border p-4">
        <Row label="Entra" cents={summary.totals.consideredIncomeCents} />
        {covenant ? (
          <Row label={covenant.name} cents={negate(covenant.consideredCents)} />
        ) : null}
        {billsTotal > 0 ? (
          <Row label="Contas fixas" cents={negate(cents(billsTotal))} />
        ) : null}
        <div className="border-border mt-1 border-t pt-2">
          <Row
            label="Livre"
            cents={summary.totals.availableToSpendCents}
            strong
          />
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <Button size="block" onClick={onFinish} disabled={saving}>
          {saving ? 'Salvando…' : 'Ver meu farol'}
        </Button>
        <Button variant="quiet" onClick={onAdjust} disabled={saving}>
          Ajustar os valores
        </Button>
      </div>
    </main>
  )
}

function Row({
  label,
  cents,
  strong,
}: {
  label: string
  cents: Cents
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn('text-sm', strong && 'font-semibold')}>{label}</dt>
      <dd>
        <MoneyValue
          cents={cents}
          size={strong ? 'lg' : 'md'}
          sign="auto"
          tone={strong ? 'default' : cents < 0 ? 'muted' : 'positive'}
        />
      </dd>
    </div>
  )
}
