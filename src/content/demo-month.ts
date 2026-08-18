import { cents } from '@/domain/money'
import { calendarPeriodOf, type LocalDate } from '@/domain/period'
import { covenantPreset, fixedBillDraft } from '@/domain/presets'
import type {
  Commitment,
  CommitmentId,
  Entry,
  EntryId,
  IncomeSource,
  IncomeSourceId,
  MemberId,
} from '@/domain/types'
import {
  computeMonth,
  type EngineInput,
  type IncomeImpact,
  type MonthSummary,
  simulateIncome,
} from '@/engine'

/**
 * O mês de exemplo da landing, calculado pela MESMA engine que roda o app.
 *
 * É a decisão que sustenta a página inteira: nada ali é maquete. O card do
 * número, as contas a vencer, a divisão do mês e a simulação de impacto saem
 * de `computeMonth`, do jeito que sairiam para um usuário de verdade. Três
 * consequências práticas:
 *
 * 1. **Não existe número desatualizado.** Mudou a regra de cálculo? A landing
 *    muda junto, no mesmo commit, sem ninguém lembrar de refazer conta.
 * 2. **As datas são de agora.** O vencimento mostra "5º dia útil" resolvido
 *    para o mês corrente, e "faltam 3 dias" é verdade. Print envelhece; isto
 *    não.
 * 3. **A conta fecha, sempre.** Rateio, arredondamento e sobra vêm das mesmas
 *    funções auditadas. Um exemplo cuja divisão não soma seria o pior anúncio
 *    possível para um app de dinheiro.
 *
 * A cena é escolhida para ser reconhecível, não confortável: uma renda perto
 * do que o público-alvo ganha, um compromisso proporcional, três contas fixas
 * e alguns gastos já lançados. Ela precisa sobrar dinheiro — há teste
 * garantindo — porque a landing mostra o produto funcionando, não um mês
 * apertado.
 */

const TIME_ZONE = 'America/Sao_Paulo'

/** Campos de auditoria que a engine ignora; existem por causa do tipo. */
const AUDIT = {
  memberId: null,
  createdBy: 'demo' as MemberId,
  createdAt: '',
  updatedAt: '',
  archivedAt: null,
}

const SALARY_CENTS = 420_000
const FREELANCE_FORECAST_CENTS = 60_000
const BILLS = [
  { id: 'rent', name: 'Aluguel', cents: 150_000, dueDay: 10 },
  { id: 'internet', name: 'Internet', cents: 12_900, dueDay: 15 },
  { id: 'power', name: 'Energia', cents: 24_100, dueDay: 20 },
] as const

const SPENDING = [
  { id: 'market', description: 'Mercado', cents: 31_200, day: 3 },
  { id: 'transport', description: 'Transporte', cents: 20_000, day: 8 },
] as const

/** O freela que a simulação de impacto usa. */
const WINDFALL_CENTS = 80_000

export const DEMO_WINDFALL_CENTS = cents(WINDFALL_CENTS)

/**
 * O mês de exemplo com as contas vencidas já quitadas.
 *
 * Sem isto, a landing envelhece dentro do próprio mês: no dia 20, o painel de
 * vencimentos mostra "3 contas atrasadas" em terracota — um exemplo de alguém
 * que perdeu o controle, na página que vende controle.
 *
 * A quitação é gerada a partir do que a PRÓPRIA engine considerou vencido, e
 * não de uma lista fixa de datas: rode em qualquer dia do mês e o exemplo mostra
 * o que já foi pago, o que vence agora e o que ainda vem. Quitação não desconta
 * do disponível — é a invariante nº 4 —, então o número em destaque não muda
 * por causa disto.
 */
export function demoInput(today: LocalDate): EngineInput {
  const pending = baseInput(today)
  const settled = computeMonth(pending).due.filter(
    (item) => item.status === 'overdue',
  )

  if (settled.length === 0) return pending

  return {
    ...pending,
    entries: [
      ...pending.entries,
      ...settled.map((item): Entry => ({
        id: `demo-settle-${item.commitmentId}` as EntryId,
        kind: 'settlement',
        period: pending.period,
        periodIsManual: false,
        date: item.dueDate,
        amountCents: item.outstandingCents,
        description: item.name,
        commitmentId: item.commitmentId,
        partId: null,
        ...AUDIT,
      })),
    ],
  }
}

function baseInput(today: LocalDate): EngineInput {
  const period = calendarPeriodOf(today)

  const incomeSources: IncomeSource[] = [
    {
      id: 'demo-salary' as IncomeSourceId,
      name: 'Salário',
      kind: 'fixed',
      forecastCents: cents(SALARY_CENTS),
      confidence: 'exact',
      recurrence: { from: period, until: null, frequency: { type: 'monthly' } },
      expectedDay: 5,
      expectedBusinessDay: null,
      ...AUDIT,
    },
    /*
      A segunda fonte é o ponto da demonstração: uma renda variável, estimada,
      que a política `confirmedOnly` NÃO soma até cair de verdade. É assim que
      o app se recusa a inflar o número com dinheiro que ainda não existe — e
      só dá para mostrar isso com duas fontes na tela.
    */
    {
      id: 'demo-freela' as IncomeSourceId,
      name: 'Freelas',
      kind: 'variable',
      forecastCents: cents(FREELANCE_FORECAST_CENTS),
      confidence: 'estimated',
      recurrence: { from: period, until: null, frequency: { type: 'monthly' } },
      expectedDay: null,
      expectedBusinessDay: null,
      ...AUDIT,
    },
  ]

  const commitments: Commitment[] = [
    {
      ...covenantPreset(period),
      id: 'demo-covenant' as CommitmentId,
      ...AUDIT,
    } as Commitment,
    ...BILLS.map(
      (bill) =>
        ({
          ...fixedBillDraft(period, bill.name, cents(bill.cents), bill.dueDay),
          id: `demo-${bill.id}` as CommitmentId,
          ...AUDIT,
        }) as Commitment,
    ),
  ]

  const entries: Entry[] = SPENDING.map((expense) => ({
    id: `demo-${expense.id}` as EntryId,
    kind: 'expense' as const,
    period,
    periodIsManual: false,
    // Gasto lançado no futuro apareceria como algo que a pessoa ainda não fez.
    // Nos primeiros dias do mês, o exemplo encolhe para caber no calendário.
    date: dayWithin(today, expense.day),
    amountCents: cents(expense.cents),
    description: expense.description,
    categoryId: null,
    ...AUDIT,
  }))

  return {
    period,
    config: {
      cycleStart: { type: 'dayOfMonth', day: 1 },
      variableIncomePolicy: 'confirmedOnly',
      timeZone: TIME_ZONE,
      currency: 'BRL',
    },
    today,
    incomeSources,
    commitments,
    plan: null,
    entries,
    carriedByCommitment: {},
  }
}

export const demoSummary = (today: LocalDate): MonthSummary =>
  computeMonth(demoInput(today))

/** As fontes de renda do exemplo. O `IncomeCard` precisa delas para dizer em
 *  que dia cada renda cai. */
export const demoSources = (today: LocalDate) => demoInput(today).incomeSources

/**
 * "Entrou um freela": o impacto real de uma renda que chega no meio do mês.
 *
 * `simulateIncome` é a diferença entre dois cálculos completos — nunca a
 * alíquota aplicada sobre o incremento. As duas contas arredondam diferente, e
 * a página estaria mentindo sobre o que o app faz.
 */
export const demoIncomeImpact = (today: LocalDate): IncomeImpact =>
  simulateIncome(demoInput(today), {
    amountCents: DEMO_WINDFALL_CENTS,
    sourceId: null,
    date: today,
    closesForecast: false,
  })

/** O dia `day` deste mês, ou hoje, o que vier primeiro. */
function dayWithin(today: LocalDate, day: number): LocalDate {
  const candidate = `${today.slice(0, 8)}${String(day).padStart(2, '0')}`
  return (candidate < today ? candidate : today) as LocalDate
}
