import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import {
  installmentAmount,
  installmentProgress,
  installmentUntil,
  MAX_INSTALLMENTS,
} from './installments'
import { cents } from './money'
import { type Period,period } from './period'
import type { RecurrenceRule } from './types'

const p = period

const monthly = (from: string, until: string | null): RecurrenceRule => ({
  from: p(from),
  until: until === null ? null : p(until),
  frequency: { type: 'monthly' },
})

describe('installmentUntil', () => {
  it('a última parcela cai no mês da primeira mais N−1', () => {
    expect(installmentUntil(p('2026-09'), 12)).toBe('2027-08')
    expect(installmentUntil(p('2026-09'), 1)).toBe('2026-09')
    expect(installmentUntil(p('2026-12'), 3)).toBe('2027-02')
  })

  it('recusa contagem inválida', () => {
    expect(() => installmentUntil(p('2026-09'), 0)).toThrow(RangeError)
    expect(() => installmentUntil(p('2026-09'), 1.5)).toThrow(RangeError)
    expect(() => installmentUntil(p('2026-09'), MAX_INSTALLMENTS + 1)).toThrow(
      RangeError,
    )
  })
})

describe('installmentAmount', () => {
  it('divide exato quando divide exato', () => {
    expect(installmentAmount(cents(600_000), 12)).toBe(50_000)
  })

  /*
    O caso que a UI precisa contar para o usuário: o modelo guarda UM valor
    mensal, então a soma das parcelas pode ficar abaixo do total digitado.
  */
  it('arredonda para baixo quando não divide exato', () => {
    expect(installmentAmount(cents(100_000), 3)).toBe(33_333)
    expect(33_333 * 3).toBe(99_999)
  })

  it('nunca reserva mais do que o total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        fc.integer({ min: 1, max: MAX_INSTALLMENTS }),
        (total, count) =>
          installmentAmount(cents(total), count) * count <= total,
      ),
    )
  })
})

describe('installmentProgress', () => {
  it('conta a parcela dentro da vigência', () => {
    const rule = monthly('2026-09', '2027-08')

    expect(installmentProgress(rule, p('2026-09'))).toEqual({
      index: 1,
      total: 12,
    })
    expect(installmentProgress(rule, p('2026-11'))).toEqual({
      index: 3,
      total: 12,
    })
    expect(installmentProgress(rule, p('2027-08'))).toEqual({
      index: 12,
      total: 12,
    })
  })

  it('devolve null fora da vigência', () => {
    const rule = monthly('2026-09', '2027-08')
    expect(installmentProgress(rule, p('2026-08'))).toBeNull()
    expect(installmentProgress(rule, p('2027-09'))).toBeNull()
  })

  it('devolve null para conta sem fim — não é parcelamento', () => {
    expect(
      installmentProgress(monthly('2026-09', null), p('2026-11')),
    ).toBeNull()
  })

  it('devolve null para periodicidade não mensal', () => {
    const yearly: RecurrenceRule = {
      from: p('2026-09'),
      until: p('2027-08'),
      frequency: { type: 'yearly', month: 9 },
    }
    expect(installmentProgress(yearly, p('2026-09'))).toBeNull()
  })

  it('o índice nunca passa do total, para qualquer vigência', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2040 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: MAX_INSTALLMENTS }),
        fc.integer({ min: 0, max: MAX_INSTALLMENTS - 1 }),
        (year, month, count, offset) => {
          const from = p(`${year}-${String(month).padStart(2, '0')}`) as Period
          const rule = monthly(from, installmentUntil(from, count))
          const progress = installmentProgress(
            rule,
            installmentUntil(from, Math.min(offset, count - 1) + 1),
          )

          return (
            progress !== null &&
            progress.total === count &&
            progress.index >= 1 &&
            progress.index <= progress.total
          )
        },
      ),
    )
  })
})
