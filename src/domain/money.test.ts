import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import {
  add,
  allocateByWeights,
  applyRate,
  atLeastZero,
  basisPoints,
  cents,
  clamp,
  divideFloor,
  formatBRL,
  formatRate,
  fromReais,
  maxOf,
  minOf,
  negate,
  parseBRL,
  roundHalfAwayFromZero,
  splitEvenly,
  subtract,
  ZERO,
} from './money'

const c = cents
const bp = basisPoints

describe('cents', () => {
  it('aceita inteiros, inclusive negativos e zero', () => {
    expect(c(0)).toBe(0)
    expect(c(1234)).toBe(1234)
    expect(c(-500)).toBe(-500)
  })

  it('rejeita fracionário, NaN e Infinity', () => {
    expect(() => c(1.5)).toThrow(RangeError)
    expect(() => c(Number.NaN)).toThrow(RangeError)
    expect(() => c(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })

  it('rejeita fora do intervalo seguro', () => {
    expect(() => c(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError)
  })
})

describe('basisPoints', () => {
  it('aceita inteiro não negativo', () => {
    expect(bp(0)).toBe(0)
    expect(bp(1500)).toBe(1500)
  })

  it('rejeita negativo e fracionário', () => {
    expect(() => bp(-1)).toThrow(RangeError)
    expect(() => bp(10.5)).toThrow(RangeError)
  })
})

describe('roundHalfAwayFromZero', () => {
  it.each([
    [2.5, 3],
    [-2.5, -3], // Math.round daria -2
    [0.5, 1],
    [-0.5, -1],
    [2.4, 2],
    [-2.4, -2],
    [0, 0],
  ])('arredonda %s para %s', (input, expected) => {
    expect(roundHalfAwayFromZero(input)).toBe(expected)
  })
})

describe('fromReais', () => {
  it('converte reais em centavos', () => {
    expect(fromReais(1234.56)).toBe(123456)
    expect(fromReais(0.1)).toBe(10)
    expect(fromReais(-50)).toBe(-5000)
  })
})

describe('parseBRL', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234.56', 123456],
    ['1234', 123400],
    ['1234,5', 123450],
    ['R$ 89,90', 8990],
    ['R$1.234.567,89', 123456789],
    ['1.234', 123400], // ponto seguido de 3 dígitos é milhar
    ['1.234.567', 123456700],
    ['-50,00', -5000],
    ['0', 0],
    ['0,01', 1],
  ])('converte %s em %i centavos', (input, expected) => {
    expect(parseBRL(input)).toBe(expected)
  })

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['1,234'], // 3 casas decimais não existem em BRL
    ['1.234.56'], // ambíguo: rejeita em vez de adivinhar
    ['1,2,3'],
    ['R$'],
    ['--5'],
  ])('rejeita %s', (input) => {
    expect(parseBRL(input)).toBeNull()
  })

  it('rejeita valor grande demais para ser representado com exatidão', () => {
    // Acima de Number.MAX_SAFE_INTEGER em centavos, a aritmética inteira deixa
    // de ser exata — e um app de dinheiro prefere recusar a mentir.
    expect(parseBRL('99999999999999999999')).toBeNull()
  })
})

describe('aritmética', () => {
  it('soma, subtrai e nega', () => {
    expect(add(c(100), c(250), c(-50))).toBe(300)
    expect(add()).toBe(0)
    expect(subtract(c(500), c(200))).toBe(300)
    expect(negate(c(500))).toBe(-500)
  })

  it('maxOf, minOf e atLeastZero', () => {
    expect(maxOf(c(100), c(200))).toBe(200)
    expect(maxOf(c(200), c(100))).toBe(200)
    expect(minOf(c(100), c(200))).toBe(100)
    expect(minOf(c(200), c(100))).toBe(100)
    expect(atLeastZero(c(-100))).toBe(ZERO)
    expect(atLeastZero(c(0))).toBe(ZERO)
    expect(atLeastZero(c(100))).toBe(100)
  })
})

describe('clamp', () => {
  it('aplica o teto e informa', () => {
    expect(clamp(c(10000), null, c(9080))).toEqual({
      value: 9080,
      clampedBy: 'ceiling',
    })
  })

  it('aplica o piso e informa', () => {
    expect(clamp(c(10), c(5000), null)).toEqual({
      value: 5000,
      clampedBy: 'floor',
    })
  })

  it('não mexe no valor dentro dos limites', () => {
    expect(clamp(c(500), c(100), c(1000))).toEqual({
      value: 500,
      clampedBy: null,
    })
    expect(clamp(c(500), null, null)).toEqual({ value: 500, clampedBy: null })
  })
})

describe('divideFloor', () => {
  it('divide com piso, nunca para cima', () => {
    expect(divideFloor(c(425000), 31)).toBe(13709) // 13709,67 -> 13709
    expect(divideFloor(c(100), 3)).toBe(33)
    expect(divideFloor(c(0), 10)).toBe(0)
  })

  it('rejeita divisor inválido', () => {
    expect(() => divideFloor(c(100), 0)).toThrow(RangeError)
    expect(() => divideFloor(c(100), -1)).toThrow(RangeError)
    expect(() => divideFloor(c(100), 1.5)).toThrow(RangeError)
  })
})

describe('applyRate — o arredondamento que sustenta o app', () => {
  it.each([
    // base,   alíquota, esperado, porquê
    [333333, 1500, 50000, 'R$ 3.333,33 x 15% = 49999,95 -> metade para cima'],
    [100005, 1500, 15001, '15000,75 -> 15001'],
    [1, 1500, 0, '0,0015 -> 0'],
    [7, 1500, 1, '1,05 -> 1'],
    [10, 1500, 2, '1,5 -> metade para cima -> 2'],
    [20, 1500, 3, '3,0 exato'],
    [-100000, 1500, -15000, 'sinal preservado'],
    [500000, 0, 0, 'alíquota zero'],
    [12345, 10000, 12345, '100% é identidade'],
    [0, 1500, 0, 'base zero'],
  ])('applyRate(%i, %i) === %i — %s', (base, rate, expected) => {
    expect(applyRate(c(base), bp(rate))).toBe(expected)
  })

  it('lança em estouro', () => {
    expect(() => applyRate(c(Number.MAX_SAFE_INTEGER), bp(10000))).toThrow(
      RangeError,
    )
  })

  it('fica sempre a menos de meio centavo do valor exato', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (base, rate) => {
          const exact = (base * rate) / 10_000
          return Math.abs(applyRate(c(base), bp(rate)) - exact) <= 0.5
        },
      ),
      { numRuns: 10_000 },
    )
  })
})

describe('allocateByWeights — a soma exata é inegociável', () => {
  it('rateia 10% + 5% preservando o total', () => {
    expect(allocateByWeights(c(50000), [1000, 500])).toEqual([33333, 16667])
  })

  it('dá o centavo sobrando a quem tem o maior resto', () => {
    // 2 centavos entre pesos 1000 e 500: cada um leva 1, e o resto maior
    // pertence à parcela de 5%.
    expect(allocateByWeights(c(2), [1000, 500])).toEqual([1, 1])
    expect(allocateByWeights(c(1), [1000, 500])).toEqual([1, 0])
  })

  it('desempata pelo menor índice, de forma determinística', () => {
    expect(allocateByWeights(c(100), [1, 1, 1])).toEqual([34, 33, 33])
  })

  it('preserva o sinal em valores negativos', () => {
    expect(allocateByWeights(c(-15000), [1000, 500])).toEqual([-10000, -5000])
  })

  it('lida com zero, pesos zerados e lista vazia sem NaN', () => {
    expect(allocateByWeights(c(0), [1000, 500])).toEqual([0, 0])
    expect(allocateByWeights(c(10), [0, 0])).toEqual([0, 0])
    expect(allocateByWeights(c(10), [])).toEqual([])
  })

  it('rejeita pesos inválidos', () => {
    expect(() => allocateByWeights(c(100), [-1, 2])).toThrow(RangeError)
    expect(() => allocateByWeights(c(100), [1.5, 2])).toThrow(RangeError)
  })

  it('a soma das partes é SEMPRE igual ao total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.array(fc.integer({ min: 0, max: 10_000 }), {
          minLength: 1,
          maxLength: 8,
        }),
        (total, weights) => {
          const parts = allocateByWeights(c(total), weights)
          const sum = parts.reduce<number>((acc, part) => acc + part, 0)
          const weightSum = weights.reduce((acc, w) => acc + w, 0)
          // Com todos os pesos zerados não há como distribuir: o resultado é
          // zero em todas as partes, e isso é o comportamento definido.
          return weightSum === 0 ? sum === 0 : sum === total
        },
      ),
      { numRuns: 10_000 },
    )
  })

  it('cada parte fica a menos de 1 centavo da fração exata', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000 }),
        fc.array(fc.integer({ min: 1, max: 10_000 }), {
          minLength: 1,
          maxLength: 8,
        }),
        (total, weights) => {
          const weightSum = weights.reduce((acc, w) => acc + w, 0)
          const parts = allocateByWeights(c(total), weights)
          return parts.every((part, index) => {
            const exact = (total * (weights[index] ?? 0)) / weightSum
            return Math.abs(part - exact) < 1
          })
        },
      ),
      { numRuns: 5_000 },
    )
  })

  it('é determinístico: mesma entrada, mesma saída', () => {
    const runs = Array.from({ length: 50 }, () =>
      allocateByWeights(c(100_000_007), [1000, 500, 333]),
    )
    expect(new Set(runs.map((run) => run.join(','))).size).toBe(1)
  })
})

describe('splitEvenly', () => {
  it('preserva a soma para qualquer número de partes', () => {
    for (let n = 1; n <= 60; n += 1) {
      const parts = splitEvenly(c(100_000), n)
      expect(parts).toHaveLength(n)
      expect(parts.reduce<number>((sum, part) => sum + part, 0)).toBe(100_000)
    }
  })
})

describe('formatação', () => {
  // O separador entre "R$" e o número é NBSP (U+00A0), não espaço comum.
  // Isso é proposital: impede que "R$" quebre linha longe do valor.
  const NBSP = ' '

  it('formata em BRL com o sinal de menos tipográfico', () => {
    expect(formatBRL(c(91750))).toBe(`R$${NBSP}917,50`)
    expect(formatBRL(c(0))).toBe(`R$${NBSP}0,00`)
    // U+2212, não hífen: alinha na coluna com o dígito tabular.
    expect(formatBRL(c(-18240))).toBe(`−R$${NBSP}182,40`)
    expect(formatBRL(c(-18240))).toContain('−')
    expect(formatBRL(c(-18240))).not.toContain('-')
  })

  it('usa espaço não separável para o R$ não quebrar linha', () => {
    expect(formatBRL(c(91750))).toContain(NBSP)
    expect(formatBRL(c(91750))).not.toContain(' ')
  })

  it('esconde os centavos quando são zero, se pedido', () => {
    expect(formatBRL(c(325000), { hideCentsWhenZero: true })).toBe(
      `R$${NBSP}3.250`,
    )
    expect(formatBRL(c(325050), { hideCentsWhenZero: true })).toBe(
      `R$${NBSP}3.250,50`,
    )
  })

  it('formata alíquotas', () => {
    expect(formatRate(bp(1000))).toBe('10%')
    expect(formatRate(bp(500))).toBe('5%')
    expect(formatRate(bp(1050))).toBe('10,5%')
    expect(formatRate(bp(0))).toBe('0%')
  })
})

describe('o cenário real da Comunhão de Bens', () => {
  it('15% de R$ 3.550,00 fecha com as parcelas de 10% e 5%', () => {
    const income = c(355_000)
    const total = applyRate(income, bp(1500))
    const parts = allocateByWeights(total, [1000, 500])

    expect(total).toBe(53_250) // R$ 532,50
    expect(parts).toEqual([35_500, 17_750]) // R$ 355,00 e R$ 177,50
    expect(parts.reduce<number>((sum, part) => sum + part, 0)).toBe(total)
  })

  it('fecha mesmo numa base que quebra o arredondamento', () => {
    const income = c(333_333) // R$ 3.333,33
    const total = applyRate(income, bp(1500))
    const parts = allocateByWeights(total, [1000, 500])

    expect(total).toBe(50_000)
    expect(parts).toEqual([33_333, 16_667])
    expect(parts.reduce<number>((sum, part) => sum + part, 0)).toBe(total)
  })
})
