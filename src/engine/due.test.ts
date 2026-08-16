import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { cents } from '@/domain/money'
import { cycleFor, isWithinCycle, localDate, period } from '@/domain/period'
import type { CommitmentId } from '@/domain/types'

import {
  dueDateWithin,
  dueSchedule,
  outstandingTotal,
  resolveWithin,
} from './due'
import type { CommitmentLine } from './types'

const cycle = (p: string, day = 1) =>
  cycleFor(period(p), { type: 'dayOfMonth', day })

const line = (
  name: string,
  dueDay: number | null,
  overrides: Partial<CommitmentLine> = {},
): CommitmentLine => ({
  commitmentId: name.toLowerCase() as CommitmentId,
  name,
  type: 'fixedAmount',
  preset: 'custom',
  order: 100,
  dueRule: dueDay === null ? null : { type: 'dayOfMonth', day: dueDay },
  baseCents: cents(0),
  forecastCents: cents(10_000),
  consideredCents: cents(10_000),
  parts: [],
  clampedBy: null,
  settledCents: cents(0),
  outstandingCents: cents(10_000),
  overpaidCents: cents(0),
  ...overrides,
})

describe('dueDateWithin', () => {
  it('resolve o dia dentro do mês, no ciclo padrão', () => {
    expect(dueDateWithin(cycle('2026-08'), 10)).toBe('2026-08-10')
    expect(dueDateWithin(cycle('2026-08'), 1)).toBe('2026-08-01')
    expect(dueDateWithin(cycle('2026-08'), 31)).toBe('2026-08-31')
  })

  it('limita ao último dia em mês curto', () => {
    // Dia 31 não existe em fevereiro: a conta vence no último dia.
    expect(dueDateWithin(cycle('2026-02'), 31)).toBe('2026-02-28')
    expect(dueDateWithin(cycle('2028-02'), 30)).toBe('2028-02-29')
    expect(dueDateWithin(cycle('2026-04'), 31)).toBe('2026-04-30')
  })

  it('vira para o mês seguinte quando o ciclo não começa no dia 1', () => {
    // Ciclo 05/08..04/09. Uma conta que vence dia 3 NÃO vence em 03/08 —
    // essa data é anterior ao ciclo. Ela vence em 03/09.
    const c = cycle('2026-08', 5)
    expect(c.start).toBe('2026-08-05')
    expect(c.end).toBe('2026-09-04')

    expect(dueDateWithin(c, 3)).toBe('2026-09-03')
    expect(dueDateWithin(c, 5)).toBe('2026-08-05')
    expect(dueDateWithin(c, 10)).toBe('2026-08-10')
    expect(dueDateWithin(c, 31)).toBe('2026-08-31')
  })

  it('a data resolvida cai dentro do ciclo, para qualquer dia e qualquer ciclo', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2024, max: 2032 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 31 }),
        fc.integer({ min: 1, max: 28 }),
        (year, month, dueDay, cycleDay) => {
          const c = cycleFor(
            period(`${year}-${String(month).padStart(2, '0')}`),
            { type: 'dayOfMonth', day: cycleDay },
          )
          return isWithinCycle(dueDateWithin(c, dueDay), c)
        },
      ),
      { numRuns: 5_000 },
    )
  })
})

describe('dueSchedule', () => {
  const today = localDate('2026-08-14')
  const c = cycle('2026-08')

  it('ignora contas sem vencimento — a data é opcional', () => {
    const items = dueSchedule({
      commitments: [line('Netflix', null), line('Aluguel', 10)],
      cycle: c,
      today,
    })
    expect(items.map((item) => item.name)).toEqual(['Aluguel'])
  })

  it('classifica atrasado, hoje, próximo e futuro', () => {
    const items = dueSchedule({
      commitments: [
        line('Luz', 10), // 10/08 — passou
        line('Internet', 14), // 14/08 — hoje
        line('Celular', 16), // 16/08 — em 2 dias
        line('Cartão', 25), // 25/08 — longe
      ],
      cycle: c,
      today,
    })

    expect(items.map((item) => [item.name, item.status])).toEqual([
      ['Luz', 'overdue'],
      ['Internet', 'today'],
      ['Celular', 'soon'],
      ['Cartão', 'upcoming'],
    ])
  })

  it('quitado sai da frente, mesmo vencido', () => {
    const items = dueSchedule({
      commitments: [
        line('Luz', 5, {
          settledCents: cents(10_000),
          outstandingCents: cents(0),
        }),
        line('Cartão', 25),
      ],
      cycle: c,
      today,
    })

    // Quitado é quitado: já foi resolvido e não é mais lembrete.
    expect(items.map((item) => [item.name, item.status])).toEqual([
      ['Cartão', 'upcoming'],
      ['Luz', 'settled'],
    ])
  })

  it('ordena por data dentro do mesmo status', () => {
    const items = dueSchedule({
      commitments: [line('C', 28), line('A', 20), line('B', 25)],
      cycle: c,
      today,
    })
    expect(items.map((item) => item.name)).toEqual(['A', 'B', 'C'])
  })

  it('desempata por nome, mantendo a ordem estável', () => {
    const items = dueSchedule({
      commitments: [line('Zebra', 20), line('Alfa', 20)],
      cycle: c,
      today,
    })
    expect(items.map((item) => item.name)).toEqual(['Alfa', 'Zebra'])
  })

  it('conta os dias que faltam, com sinal', () => {
    const items = dueSchedule({
      commitments: [line('Passou', 10), line('Hoje', 14), line('Falta', 20)],
      cycle: c,
      today,
    })
    expect(items.map((item) => item.daysUntil)).toEqual([-4, 0, 6])
  })

  it('soma o que ainda falta pagar', () => {
    const items = dueSchedule({
      commitments: [
        line('A', 10, { outstandingCents: cents(5_000) }),
        line('B', 20, { outstandingCents: cents(7_500) }),
        line('C', 25, { outstandingCents: cents(0) }),
      ],
      cycle: c,
      today,
    })
    expect(outstandingTotal(items)).toBe(12_500)
  })

  it('devolve lista vazia quando nada tem vencimento', () => {
    expect(
      dueSchedule({ commitments: [line('X', null)], cycle: c, today }),
    ).toEqual([])
    expect(outstandingTotal([])).toBe(0)
  })
})

describe('vencimento por dia útil', () => {
  const businessLine = (name: string, n: number): CommitmentLine => ({
    ...line(name, null),
    dueRule: { type: 'businessDay', n },
  })

  it('o 5º dia útil de agosto de 2026 é dia 7, não dia 5', () => {
    // É a razão de a regra existir: agosto começa num sábado.
    expect(
      resolveWithin(cycle('2026-08'), { type: 'businessDay', n: 5 }),
    ).toBe('2026-08-07')
    expect(dueDateWithin(cycle('2026-08'), 5)).toBe('2026-08-05')
  })

  it('entra no cronograma junto com as contas de dia fixo', () => {
    const items = dueSchedule({
      commitments: [
        businessLine('Comunhão de Bens', 5), // 07/08
        line('Aluguel', 10), // 10/08
      ],
      cycle: cycle('2026-08'),
      today: localDate('2026-08-01'),
    })

    expect(items.map((item) => [item.name, item.dueDate])).toEqual([
      ['Comunhão de Bens', '2026-08-07'],
      ['Aluguel', '2026-08-10'],
    ])
  })

  it('carrega a regra, para a UI poder explicar a data', () => {
    const [item] = dueSchedule({
      commitments: [businessLine('Comunhão de Bens', 5)],
      cycle: cycle('2026-08'),
      today: localDate('2026-08-01'),
    })
    expect(item?.rule).toEqual({ type: 'businessDay', n: 5 })
  })

  it('respeita a virada quando o ciclo não começa no dia 1', () => {
    // Ciclo 10/08..09/09: o 5º útil de agosto (07/08) é anterior ao ciclo,
    // então vale o 5º útil de setembro — que é dia 8, porque 07/09 é feriado.
    const c = cycle('2026-08', 10)
    expect(resolveWithin(c, { type: 'businessDay', n: 5 })).toBe('2026-09-08')
  })
})
