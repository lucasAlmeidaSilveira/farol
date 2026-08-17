import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import {
  addDays,
  addMonths,
  calendarPeriodOf,
  comparePeriods,
  cycleFor,
  type CycleStart,
  dayOfMonth,
  daysBetween,
  isLocalDate,
  isPeriod,
  isWithinCycle,
  lastDayOfMonth,
  localDate,
  makePeriod,
  monthsBetween,
  period,
  periodOf,
  todayIn,
  weekdayOf,
  yearMonth,
} from './period'

const p = period
const d = localDate
const start = (day: number): CycleStart => ({ type: 'dayOfMonth', day })

/**
 * A faixa é limitada de propósito: `LocalDate` exige ano de 4 dígitos, então
 * gerar perto do ano 1000 estoura o formato ao somar ou subtrair dias — e o que
 * se quer testar aqui é a aritmética, não o limite do tipo.
 */
const anyLocalDate = fc
  .date({
    min: new Date(Date.UTC(2020, 0, 1)),
    max: new Date(Date.UTC(2040, 11, 31)),
    noInvalidDate: true,
  })
  .map((date) => localDate(date.toISOString().slice(0, 10)))

describe('construtores', () => {
  it('aceitam formatos válidos', () => {
    expect(p('2026-08')).toBe('2026-08')
    expect(d('2026-08-14')).toBe('2026-08-14')
  })

  it.each(['2026-13', '2026-00', '202608', '2026-8', '2026-08-01', ''])(
    'rejeitam período inválido %s',
    (value) => {
      expect(() => p(value)).toThrow(RangeError)
      expect(isPeriod(value)).toBe(false)
    },
  )

  it.each(['2026-08-32', '2026-08-00', '2026-13-01', '2026-08', '14/08/2026'])(
    'rejeitam data inválida %s',
    (value) => {
      expect(() => d(value)).toThrow(RangeError)
      expect(isLocalDate(value)).toBe(false)
    },
  )
})

describe('aritmética de mês', () => {
  it('soma e subtrai meses cruzando o ano', () => {
    expect(addMonths(p('2026-12'), 1)).toBe('2027-01')
    expect(addMonths(p('2026-01'), -1)).toBe('2025-12')
    expect(addMonths(p('2026-08'), 0)).toBe('2026-08')
    expect(addMonths(p('2026-01'), 24)).toBe('2028-01')
    expect(addMonths(p('2026-01'), -13)).toBe('2024-12')
  })

  it('conta a distância em meses', () => {
    expect(monthsBetween(p('2026-01'), p('2026-12'))).toBe(11)
    expect(monthsBetween(p('2026-12'), p('2026-01'))).toBe(-11)
    expect(monthsBetween(p('2026-08'), p('2026-08'))).toBe(0)
  })

  it('ordena cronologicamente', () => {
    expect(comparePeriods(p('2026-01'), p('2026-02'))).toBe(-1)
    expect(comparePeriods(p('2026-02'), p('2026-01'))).toBe(1)
    expect(comparePeriods(p('2026-01'), p('2026-01'))).toBe(0)
  })

  it('decompõe e recompõe', () => {
    expect(yearMonth(p('2026-08'))).toEqual({ year: 2026, month: 8 })
    expect(makePeriod(2026, 8)).toBe('2026-08')
  })

  it('sabe o tamanho de cada mês, inclusive bissexto', () => {
    expect(lastDayOfMonth(2026, 1)).toBe(31)
    expect(lastDayOfMonth(2026, 2)).toBe(28)
    expect(lastDayOfMonth(2028, 2)).toBe(29)
    expect(lastDayOfMonth(2026, 4)).toBe(30)
    expect(lastDayOfMonth(2000, 2)).toBe(29) // século divisível por 400
    expect(lastDayOfMonth(1900, 2)).toBe(28) // século não divisível por 400
  })

  it('a ordenação lexicográfica é a ordenação cronológica', () => {
    const shuffled = ['2026-10', '2025-12', '2026-02', '2026-01']
    expect([...shuffled].sort()).toEqual([
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-10',
    ])
  })
})

describe('aritmética de dia', () => {
  it('soma dias cruzando mês e ano', () => {
    expect(addDays(d('2026-08-31'), 1)).toBe('2026-09-01')
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01')
    expect(addDays(d('2026-03-01'), -1)).toBe('2026-02-28')
    expect(addDays(d('2028-03-01'), -1)).toBe('2028-02-29')
    expect(addDays(d('2026-08-14'), 0)).toBe('2026-08-14')
  })

  it('conta dias entre datas', () => {
    expect(daysBetween(d('2026-08-01'), d('2026-08-31'))).toBe(30)
    expect(daysBetween(d('2026-08-14'), d('2026-08-14'))).toBe(0)
    expect(daysBetween(d('2026-08-31'), d('2026-08-01'))).toBe(-30)
  })

  it('extrai mês de calendário e dia', () => {
    expect(calendarPeriodOf(d('2026-08-14'))).toBe('2026-08')
    expect(dayOfMonth(d('2026-08-14'))).toBe(14)
    expect(dayOfMonth(d('2026-08-01'))).toBe(1)
  })

  it('dá o dia da semana, com domingo em 0', () => {
    // A âncora do cálculo: 1970-01-01 foi uma quinta-feira.
    expect(weekdayOf(d('1970-01-01'))).toBe(4)

    // Agosto de 2026 começa num sábado — é o mês que faz o quinto dia útil
    // cair no dia 7, e o mesmo fato governa a grade do calendário.
    expect(weekdayOf(d('2026-08-01'))).toBe(6)
    expect(weekdayOf(d('2026-08-02'))).toBe(0)

    // Antes de 1970 o epoch day é negativo, onde `%` devolveria negativo.
    expect(weekdayOf(d('1969-12-31'))).toBe(3)
  })

  it('o dia da semana se repete a cada 7 dias e nunca sai de 0..6', () => {
    fc.assert(
      fc.property(anyLocalDate, (date) => {
        const day = weekdayOf(date)

        expect(day).toBeGreaterThanOrEqual(0)
        expect(day).toBeLessThanOrEqual(6)
        expect(weekdayOf(addDays(date, 7))).toBe(day)
        expect(weekdayOf(addDays(date, -7))).toBe(day)
      }),
    )
  })
})

describe('cycleFor', () => {
  it('ciclo padrão do dia 1 é o mês do calendário', () => {
    expect(cycleFor(p('2026-08'), start(1))).toEqual({
      period: '2026-08',
      start: '2026-08-01',
      end: '2026-08-31',
      totalDays: 31,
    })
  })

  it('fevereiro comum e bissexto', () => {
    expect(cycleFor(p('2026-02'), start(1)).totalDays).toBe(28)
    expect(cycleFor(p('2028-02'), start(1)).totalDays).toBe(29)
  })

  it('quem recebe dia 5 tem o ciclo deslocado', () => {
    expect(cycleFor(p('2026-08'), start(5))).toEqual({
      period: '2026-08',
      start: '2026-08-05',
      end: '2026-09-04',
      totalDays: 31,
    })
  })

  it('dia 31 é limitado ao último dia de cada mês', () => {
    expect(cycleFor(p('2026-01'), start(31))).toEqual({
      period: '2026-01',
      start: '2026-01-31',
      end: '2026-02-27',
      totalDays: 28,
    })
  })

  it('sabe se uma data está dentro do ciclo', () => {
    const cycle = cycleFor(p('2026-08'), start(5))
    expect(isWithinCycle(d('2026-08-05'), cycle)).toBe(true)
    expect(isWithinCycle(d('2026-09-04'), cycle)).toBe(true)
    expect(isWithinCycle(d('2026-08-04'), cycle)).toBe(false)
    expect(isWithinCycle(d('2026-09-05'), cycle)).toBe(false)
  })
})

describe('periodOf', () => {
  it('com ciclo dia 1 é o mês do calendário', () => {
    expect(periodOf(d('2026-08-01'), start(1))).toBe('2026-08')
    expect(periodOf(d('2026-08-31'), start(1))).toBe('2026-08')
  })

  it('com ciclo dia 5, o começo do mês pertence ao período anterior', () => {
    expect(periodOf(d('2026-09-04'), start(5))).toBe('2026-08')
    expect(periodOf(d('2026-09-05'), start(5))).toBe('2026-09')
  })

  it('com ciclo dia 31, respeita o clamp de mês curto', () => {
    expect(periodOf(d('2026-02-28'), start(31))).toBe('2026-02')
    expect(periodOf(d('2026-02-27'), start(31))).toBe('2026-01')
    expect(periodOf(d('2026-03-30'), start(31))).toBe('2026-02')
    expect(periodOf(d('2026-03-31'), start(31))).toBe('2026-03')
  })
})

describe('as invariantes do ciclo', () => {
  const anyCycleStart = fc.integer({ min: 1, max: 31 }).map((day) => start(day))

  it('periodOf e cycleFor são inversas para qualquer data e qualquer dia D', () => {
    fc.assert(
      fc.property(anyLocalDate, anyCycleStart, (date, cycleStart) =>
        isWithinCycle(date, cycleFor(periodOf(date, cycleStart), cycleStart)),
      ),
      { numRuns: 10_000 },
    )
  })

  it('ciclos consecutivos não deixam buraco nem se sobrepõem', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2040 }),
        fc.integer({ min: 1, max: 12 }),
        anyCycleStart,
        (year, month, cycleStart) => {
          const current = cycleFor(makePeriod(year, month), cycleStart)
          const next = cycleFor(
            addMonths(makePeriod(year, month), 1),
            cycleStart,
          )
          return next.start === addDays(current.end, 1)
        },
      ),
      { numRuns: 5_000 },
    )
  })

  it('o total de dias bate com a distância entre início e fim', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2040 }),
        fc.integer({ min: 1, max: 12 }),
        anyCycleStart,
        (year, month, cycleStart) => {
          const cycle = cycleFor(makePeriod(year, month), cycleStart)
          return cycle.totalDays === daysBetween(cycle.start, cycle.end) + 1
        },
      ),
      { numRuns: 5_000 },
    )
  })

  it('somar e subtrair a mesma quantidade de dias volta ao ponto de partida', () => {
    fc.assert(
      fc.property(
        anyLocalDate,
        fc.integer({ min: -2000, max: 2000 }),
        (date, days) => addDays(addDays(date, days), -days) === date,
      ),
      { numRuns: 5_000 },
    )
  })
})

describe('todayIn — a única fronteira com o relógio', () => {
  it('23h de 31/08 em São Paulo NÃO vira setembro', () => {
    // 01/09 02:00 UTC é 31/08 23:00 em BRT. É o bug clássico de fechamento
    // de mês no Brasil, e este teste existe para que ele nunca volte.
    expect(todayIn('America/Sao_Paulo', new Date('2026-09-01T02:00:00Z'))).toBe(
      '2026-08-31',
    )
  })

  it('a virada do dia acontece na meia-noite local', () => {
    expect(todayIn('America/Sao_Paulo', new Date('2026-08-31T02:59:59Z'))).toBe(
      '2026-08-30',
    )
    expect(todayIn('America/Sao_Paulo', new Date('2026-08-31T03:00:00Z'))).toBe(
      '2026-08-31',
    )
  })

  it('respeita fusos diferentes no mesmo instante', () => {
    const instant = new Date('2026-09-01T02:00:00Z')
    expect(todayIn('America/Sao_Paulo', instant)).toBe('2026-08-31')
    expect(todayIn('UTC', instant)).toBe('2026-09-01')
    expect(todayIn('Asia/Tokyo', instant)).toBe('2026-09-01')
  })

  it('devolve uma LocalDate válida sem argumento de tempo', () => {
    expect(isLocalDate(todayIn('America/Sao_Paulo'))).toBe(true)
  })
})
