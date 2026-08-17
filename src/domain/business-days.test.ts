import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import {
  bankHolidays,
  businessDayLabel,
  businessDaysInMonth,
  easterSunday,
  isBusinessDay,
  nthBusinessDay,
} from './business-days'
import { addDays, localDate, period } from './period'

describe('Páscoa', () => {
  it.each([
    [2020, '2020-04-12'],
    [2021, '2021-04-04'],
    [2022, '2022-04-17'],
    [2023, '2023-04-09'],
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
  ])('em %i cai em %s', (year, expected) => {
    expect(easterSunday(year)).toBe(expected)
  })

  it('cai sempre num domingo', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1900, max: 2200 }), (year) => {
        const date = new Date(`${easterSunday(year)}T00:00:00Z`)
        return date.getUTCDay() === 0
      }),
      { numRuns: 300 },
    )
  })
})

describe('feriados bancários', () => {
  it('inclui os fixos nacionais', () => {
    const holidays = bankHolidays(2026)
    expect(holidays.has('2026-01-01')).toBe(true)
    expect(holidays.has('2026-04-21')).toBe(true)
    expect(holidays.has('2026-05-01')).toBe(true)
    expect(holidays.has('2026-09-07')).toBe(true)
    expect(holidays.has('2026-12-25')).toBe(true)
  })

  it('inclui os móveis derivados da Páscoa', () => {
    // Páscoa 2026 é 05/04.
    const holidays = bankHolidays(2026)
    expect(holidays.has('2026-02-16')).toBe(true) // Carnaval, segunda
    expect(holidays.has('2026-02-17')).toBe(true) // Carnaval, terça
    expect(holidays.has('2026-04-03')).toBe(true) // Sexta-feira Santa
    expect(holidays.has('2026-06-04')).toBe(true) // Corpus Christi
  })

  it('quarta-feira de cinzas NÃO é feriado bancário cheio', () => {
    // Bancos abrem à tarde, e a folha conta o dia como útil.
    expect(bankHolidays(2026).has('2026-02-18')).toBe(false)
  })

  it('Consciência Negra só é nacional a partir de 2024', () => {
    expect(bankHolidays(2023).has('2023-11-20')).toBe(false)
    expect(bankHolidays(2024).has('2024-11-20')).toBe(true)
    expect(bankHolidays(2026).has('2026-11-20')).toBe(true)
  })
})

describe('isBusinessDay', () => {
  it('recusa sábado e domingo', () => {
    expect(isBusinessDay(localDate('2026-08-01'))).toBe(false) // sábado
    expect(isBusinessDay(localDate('2026-08-02'))).toBe(false) // domingo
    expect(isBusinessDay(localDate('2026-08-03'))).toBe(true) // segunda
  })

  it('recusa feriado nacional em dia de semana', () => {
    // 07/09/2026 é uma segunda-feira.
    expect(isBusinessDay(localDate('2026-09-07'))).toBe(false)
  })
})

describe('nthBusinessDay — o quinto dia útil', () => {
  it('agosto de 2026 começa num sábado, então o 5º útil é dia 7', () => {
    // 01 sáb · 02 dom · 03 seg(1) · 04 ter(2) · 05 qua(3) · 06 qui(4) · 07 sex(5)
    expect(nthBusinessDay(period('2026-08'), 5)).toBe('2026-08-07')
  })

  it('quando o mês começa numa quinta, o 5º útil é dia 7', () => {
    // 01/01/2026 é quinta E feriado. 02 sex(1) · 05 seg(2) · 06(3) · 07(4) · 08(5)
    expect(nthBusinessDay(period('2026-01'), 5)).toBe('2026-01-08')
  })

  it('pula o feriado no meio da contagem', () => {
    // Setembro de 2026: 01 ter(1) · 02(2) · 03(3) · 04 sex(4) · 07 FERIADO
    // · 08 ter(5)
    expect(nthBusinessDay(period('2026-09'), 5)).toBe('2026-09-08')
  })

  it('o primeiro dia útil é o primeiro dia que não é fim de semana nem feriado', () => {
    expect(nthBusinessDay(period('2026-08'), 1)).toBe('2026-08-03')
    expect(nthBusinessDay(period('2026-01'), 1)).toBe('2026-01-02')
  })

  it('devolve o último dia útil quando o mês tem menos que o pedido', () => {
    const total = businessDaysInMonth(period('2026-02'))
    expect(nthBusinessDay(period('2026-02'), 99)).toBe(
      nthBusinessDay(period('2026-02'), total),
    )
  })

  it('a data devolvida é sempre um dia útil DO mês pedido', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2024, max: 2032 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 23 }),
        (year, month, n) => {
          const target = period(`${year}-${String(month).padStart(2, '0')}`)
          const date = nthBusinessDay(target, n)
          return date.startsWith(target) && isBusinessDay(date)
        },
      ),
      { numRuns: 3_000 },
    )
  })

  it('é monotônico: o N-ésimo nunca vem antes do anterior', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2024, max: 2032 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 2, max: 15 }),
        (year, month, n) => {
          const target = period(`${year}-${String(month).padStart(2, '0')}`)
          return nthBusinessDay(target, n) >= nthBusinessDay(target, n - 1)
        },
      ),
      { numRuns: 2_000 },
    )
  })
})

describe('businessDaysInMonth', () => {
  it('nenhum mês passa de 23 dias úteis', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2024, max: 2040 }),
        fc.integer({ min: 1, max: 12 }),
        (year, month) => {
          const total = businessDaysInMonth(
            period(`${year}-${String(month).padStart(2, '0')}`),
          )
          return total >= 17 && total <= 23
        },
      ),
      { numRuns: 2_000 },
    )
  })

  it('bate com a contagem dia a dia', () => {
    const target = period('2026-08')
    let manual = 0
    let cursor = localDate('2026-08-01')
    while (cursor.startsWith(target)) {
      if (isBusinessDay(cursor)) manual += 1
      cursor = addDays(cursor, 1)
    }
    expect(businessDaysInMonth(target)).toBe(manual)
  })
})

describe('businessDayLabel', () => {
  it('escreve o ordinal como a UI mostra', () => {
    expect(businessDayLabel(1)).toBe('1º dia útil')
    expect(businessDayLabel(5)).toBe('5º dia útil')
  })
})
