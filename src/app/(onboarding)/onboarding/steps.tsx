'use client'

import { MoneyInput } from '@/components/money/money-input'
import { MoneyValue } from '@/components/money/money-value'
import { ExpensePicker } from '@/components/plan/expense-picker'
import { Button } from '@/components/ui/button'
import { type Cents, cents } from '@/domain/money'
import { bandMidpointCents, INCOME_BANDS } from '@/domain/presets'
import { cn } from '@/lib/utils'

import type { OnboardingState } from './preview'

/**
 * Os passos do onboarding.
 *
 * A decisão que sustenta o fluxo inteiro: NUNCA pedir um número exato. O
 * público-alvo é exatamente quem não sabe responder "quanto você ganha?". Toda
 * entrada de valor é uma SELEÇÃO, e cada resposta grava `confidence`, para o
 * app ficar honesto sobre a própria precisão em vez de travar agora.
 */

// ------------------------------------------------------------------- renda

export function IncomeStep({
  value,
  onChange,
}: {
  value: OnboardingState
  onChange: (patch: Partial<OnboardingState>) => void
}) {
  const exactMode = value.incomeConfidence === 'exact'

  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        title="Quanto costuma cair na sua conta por mês?"
        hint="Não precisa ser exato. A gente ajusta depois."
      />

      {exactMode ? (
        <ExactAmountField
          value={value.incomeCents}
          onChange={(incomeCents) => onChange({ incomeCents })}
          onCancel={() =>
            onChange({ incomeConfidence: 'estimated', incomeCents: cents(0) })
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            {INCOME_BANDS.map((band) => {
              const midpoint = bandMidpointCents(band)
              const selected = value.incomeCents === midpoint

              return (
                <button
                  key={band.id}
                  type="button"
                  aria-pressed={selected}
                  // Um toque já responde e avança: nada de "Próximo".
                  onClick={() =>
                    onChange({
                      incomeCents: midpoint,
                      incomeConfidence: 'estimated',
                    })
                  }
                  className={cn(
                    'flex min-h-16 items-center justify-center rounded-lg border px-3 text-center text-sm font-medium transition-colors',
                    selected
                      ? 'border-accent-border bg-accent text-accent-foreground'
                      : 'border-input hover:bg-muted',
                  )}
                >
                  {band.label}
                </button>
              )
            })}
          </div>

          <Button
            variant="quiet"
            className="self-start px-0"
            onClick={() => onChange({ incomeConfidence: 'exact' })}
          >
            Sei o valor exato →
          </Button>
        </>
      )}

      {/*
        Acolhedor, não instrucional: dá um caminho concreto para quem quer
        precisão, sem cobrar de quem não vai olhar.
      */}
      <p className="text-muted-foreground border-border border-t pt-4 text-sm text-balance">
        <span aria-hidden="true">⌁ </span>
        Onde olhar: abra o app do seu banco e procure o último depósito de
        salário.
      </p>
    </div>
  )
}

function ExactAmountField({
  value,
  onChange,
  onCancel,
}: {
  value: Cents
  onChange: (value: Cents) => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Valor mensal</span>
        <MoneyInput
          autoFocus
          value={value}
          onChange={onChange}
          placeholder="3.250,00"
          className="h-14 px-4 text-lg"
        />
      </label>
      <Button variant="quiet" className="self-start px-0" onClick={onCancel}>
        ← Prefiro escolher uma faixa
      </Button>
    </div>
  )
}

// -------------------------------------------------------- renda variável

const VARIABLE_OPTIONS = [
  { id: 'often', label: 'Sim, todo mês' },
  { id: 'sometimes', label: 'De vez em quando' },
  { id: 'never', label: 'Não, só o salário' },
] as const

export function VariableIncomeStep({
  value,
  onChange,
}: {
  value: OnboardingState
  onChange: (patch: Partial<OnboardingState>) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        title="Entra algum dinheiro extra além disso?"
        hint="Freela, bico, venda, ajuda de alguém."
      />

      <div className="flex flex-col gap-2.5">
        {VARIABLE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value.variableIncome === option.id}
            onClick={() => onChange({ variableIncome: option.id })}
            className={cn(
              'flex min-h-14 items-center rounded-lg border px-4 text-left font-medium transition-colors',
              value.variableIncome === option.id
                ? 'border-accent-border bg-accent text-accent-foreground'
                : 'border-input hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ compromisso

export function CovenantStep({
  value,
  onChange,
}: {
  value: OnboardingState
  onChange: (patch: Partial<OnboardingState>) => void
}) {
  // 15% da renda que a pessoa acabou de informar. Mostrar o número dela, e não
  // um exemplo genérico, é o que transforma o passo numa confirmação.
  const covenantCents = Math.round(value.incomeCents * 0.15) as Cents

  return (
    <div className="flex flex-col gap-6">
      <StepHeading
        title="Você separa uma parte fixa todo mês?"
        hint="Dízimo, oferta, poupança — algo que sai antes de qualquer gasto."
      />

      <button
        type="button"
        aria-pressed={value.withCovenant}
        onClick={() => onChange({ withCovenant: !value.withCovenant })}
        className={cn(
          'flex flex-col gap-3 rounded-lg border p-4 text-left transition-colors',
          value.withCovenant
            ? 'border-covenant bg-covenant-soft'
            : 'border-input',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-covenant-soft-foreground flex items-center gap-1.5 font-semibold">
            <span aria-hidden="true">✦</span> Comunhão de Bens
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'flex h-6 w-11 items-center rounded-full p-0.5 transition-colors',
              value.withCovenant ? 'bg-covenant' : 'bg-input',
            )}
          >
            <span
              className={cn(
                'size-5 rounded-full bg-white transition-transform',
                value.withCovenant && 'translate-x-5',
              )}
            />
          </span>
        </div>

        <p className="text-muted-foreground text-sm">
          10% + 5% de tudo que entrar no mês
        </p>

        {value.incomeCents > 0 ? (
          <p className="text-sm">
            Com <MoneyValue cents={value.incomeCents} size="sm" />, dá{' '}
            <MoneyValue cents={covenantCents} size="sm" tone="covenant" />
          </p>
        ) : null}
      </button>

      <p className="text-muted-foreground text-sm text-balance">
        Se entrar um freela, isso sobe junto. Sozinho.
      </p>
    </div>
  )
}

// ------------------------------------------------------------ contas fixas

/** Prefixo dos gastos criados à mão, para distinguir dos que vêm do catálogo. */
const CUSTOM_PREFIX = 'custom-'

export function BillsStep({
  value,
  onChange,
}: {
  value: OnboardingState
  onChange: (patch: Partial<OnboardingState>) => void
}) {
  const patchBills = (bills: OnboardingState['bills']) => onChange({ bills })

  const update = (
    id: string,
    patch: Partial<OnboardingState['bills'][number]>,
  ) =>
    patchBills(
      value.bills.map((bill) =>
        bill.id === id ? { ...bill, ...patch } : bill,
      ),
    )

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="O que sai todo mês, sem falta?"
        hint="Abra uma categoria e marque o que você tem. Os valores já vêm sugeridos."
      />

      <ExpensePicker
        customPrefix={CUSTOM_PREFIX}
        selected={value.bills}
        onToggle={(item) => {
          const already = value.bills.some((bill) => bill.id === item.id)
          patchBills(
            already
              ? value.bills.filter((bill) => bill.id !== item.id)
              : [
                  ...value.bills,
                  {
                    id: item.id,
                    label: item.name,
                    // O valor sugerido evita digitação. A pessoa só corrige o
                    // que estiver claramente errado — é isso que permite montar
                    // o plano sem digitar nenhum número.
                    amountCents: cents(item.suggestedCents),
                  },
                ],
          )
        }}
        onSetAmount={(id, amountCents) => update(id, { amountCents })}
        onRenameCustom={(id, label) => update(id, { label })}
        onRemove={(id) =>
          patchBills(value.bills.filter((bill) => bill.id !== id))
        }
        onAddCustom={(label) =>
          patchBills([
            ...value.bills,
            {
              id: `${CUSTOM_PREFIX}${Date.now().toString(36)}`,
              label,
              amountCents: cents(0),
            },
          ])
        }
      />
    </div>
  )
}

// ----------------------------------------------------------------- comuns

function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      <p className="text-muted-foreground text-balance">{hint}</p>
    </header>
  )
}
