import { z } from 'zod'

/**
 * Dinheiro no Farol é SEMPRE inteiro em centavos, e percentual é SEMPRE inteiro
 * em basis points. Nenhuma operação monetária do app pode tocar em float fora
 * das funções auditadas deste arquivo.
 *
 * Os branded types existem para que `valorEmReais` não possa ser passado onde
 * se espera `Cents` — o erro mais caro e mais silencioso de um app financeiro.
 */

declare const centsBrand: unique symbol
/** Valor monetário em centavos inteiros. R$ 12,34 é `1234`. */
export type Cents = number & { readonly [centsBrand]: true }

declare const basisPointsBrand: unique symbol
/** Percentual inteiro em basis points. 1% = 100bp · 10% = 1000bp · 15% = 1500bp. */
export type BasisPoints = number & { readonly [basisPointsBrand]: true }

/** Escala dos basis points: 10.000bp = 100%. */
const BP_SCALE = 10_000

export const ZERO = 0 as Cents

/** Teto de sanidade: R$ 10.000.000,00. Acima disso é bug ou abuso, não dinheiro. */
export const MAX_CENTS = 1_000_000_000

export function cents(value: number): Cents {
  if (!Number.isInteger(value)) {
    throw new RangeError(`Cents exige inteiro, recebeu ${value}`)
  }
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Cents fora do intervalo seguro: ${value}`)
  }
  return value as Cents
}

export function basisPoints(value: number): BasisPoints {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `BasisPoints exige inteiro não negativo, recebeu ${value}`,
    )
  }
  return value as BasisPoints
}

// ---------------------------------------------------------------- conversão

/**
 * Arredondamento comercial: metade para longe do zero.
 * `Math.round` erra em negativos — `Math.round(-2.5)` é `-2`, não `-3`.
 */
export function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value))
}

/** Apenas para seeds e testes. Na UI use `parseBRL`, que não passa por float. */
export function fromReais(reais: number): Cents {
  return cents(roundHalfAwayFromZero(reais * 100))
}

/**
 * Converte texto digitado em centavos sem float intermediário.
 * Aceita `"1.234,56"`, `"1234,56"`, `"1234.56"`, `"R$ 89,90"`, `"1234"`.
 * Devolve `null` para qualquer entrada ambígua ou inválida.
 */
export function parseBRL(input: string): Cents | null {
  const cleaned = input.replace(/[R$\s ]/g, '')
  if (cleaned === '') return null

  const negative = cleaned.startsWith('-')
  const unsigned = negative ? cleaned.slice(1) : cleaned
  if (!/^[\d.,]+$/.test(unsigned)) return null

  let normalized = unsigned
  if (unsigned.includes(',')) {
    // Havendo vírgula, ela é o separador decimal e os pontos são de milhar.
    normalized = unsigned.replace(/\./g, '').replace(',', '.')
  } else if (/\.\d{3}$/.test(unsigned)) {
    // "1.234" / "1.234.567": ponto seguido de exatamente 3 dígitos é milhar.
    normalized = unsigned.replace(/\./g, '')
  }

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!match) return null

  const [, whole = '0', fraction = ''] = match
  const value = Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2))
  if (!Number.isSafeInteger(value)) return null

  return cents(negative ? -value : value)
}

// -------------------------------------------------------------- aritmética

export const add = (...values: readonly Cents[]): Cents =>
  cents(values.reduce<number>((sum, value) => sum + value, 0))

export const subtract = (a: Cents, b: Cents): Cents => cents(a - b)

export const negate = (value: Cents): Cents => cents(-value)

export const maxOf = (a: Cents, b: Cents): Cents => (a >= b ? a : b)

export const minOf = (a: Cents, b: Cents): Cents => (a <= b ? a : b)

export const atLeastZero = (value: Cents): Cents => (value > 0 ? value : ZERO)

export type ClampResult = {
  value: Cents
  clampedBy: 'floor' | 'ceiling' | null
}

/** Aplica piso e teto opcionais, informando qual dos dois atuou. */
export function clamp(
  value: Cents,
  floor: Cents | null,
  ceiling: Cents | null,
): ClampResult {
  if (ceiling !== null && value > ceiling) {
    return { value: ceiling, clampedBy: 'ceiling' }
  }
  if (floor !== null && value < floor) {
    return { value: floor, clampedBy: 'floor' }
  }
  return { value, clampedBy: null }
}

/**
 * Divisão com piso. Usada na sugestão diária: arredondar para cima faria a
 * sugestão somar mais do que a pessoa tem.
 */
export function divideFloor(total: Cents, divisor: number): Cents {
  if (!Number.isInteger(divisor) || divisor <= 0) {
    throw new RangeError(
      `Divisor precisa ser inteiro positivo, recebeu ${divisor}`,
    )
  }
  return cents(Math.floor(total / divisor))
}

// ------------------------------------------------------ alíquota e rateio

/**
 * Aplica uma alíquota com aritmética inteira exata — sem divisão em float
 * antes do arredondamento. Metade para cima em valor absoluto.
 *
 *   applyRate(333333, 1500) === 50000   // R$ 3.333,33 x 15% = R$ 500,00
 *   applyRate(10, 1500)     === 2       // 1,5 centavo arredonda para 2
 */
export function applyRate(base: Cents, rate: BasisPoints): Cents {
  const negative = base < 0
  const product = Math.abs(base) * rate

  if (!Number.isSafeInteger(product)) {
    throw new RangeError(`Estouro ao aplicar alíquota: ${base} x ${rate}`)
  }

  const quotient = Math.floor(product / BP_SCALE)
  const remainder = product % BP_SCALE
  const rounded = remainder * 2 >= BP_SCALE ? quotient + 1 : quotient

  return cents(negative ? -rounded : rounded)
}

type Share = {
  index: number
  value: number
  remainder: number
}

/**
 * Rateia um total entre pesos pelo método do maior resto (Hare).
 *
 * GARANTIA: a soma das partes é EXATAMENTE igual ao total, sempre. É por isso
 * que o compromisso proporcional calcula o total com a soma das alíquotas e
 * depois rateia — aplicar 10% e 5% separadamente e somar pode divergir de 15%.
 *
 * O desempate é determinístico pelo menor índice, para que a mesma entrada
 * produza sempre a mesma saída.
 *
 *   allocateByWeights(50000, [1000, 500]) === [33333, 16667]   // soma 50000
 */
export function allocateByWeights(
  total: Cents,
  weights: readonly number[],
): Cents[] {
  if (weights.length === 0) return []

  if (weights.some((weight) => !Number.isInteger(weight) || weight < 0)) {
    throw new RangeError('Pesos de rateio precisam ser inteiros não negativos')
  }

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  if (weightSum === 0) return weights.map(() => ZERO)

  const sign = total < 0 ? -1 : 1
  const magnitude = Math.abs(total)

  const shares: Share[] = weights.map((weight, index) => {
    const product = magnitude * weight
    return {
      index,
      value: Math.floor(product / weightSum),
      remainder: product % weightSum,
    }
  })

  const distributed = shares.reduce((sum, share) => sum + share.value, 0)
  const leftover = magnitude - distributed // sempre 0 <= leftover < weights.length

  // `shares` e a cópia ordenada compartilham os mesmos objetos, então mutar
  // aqui já corrige a parte na posição original — sem indexação por número.
  ;[...shares]
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .slice(0, leftover)
    .forEach((share) => {
      share.value += 1
    })

  return shares.map((share) => cents(sign * share.value))
}

/** Divide um total em N partes iguais, preservando a soma exata. */
export const splitEvenly = (total: Cents, parts: number): Cents[] =>
  allocateByWeights(
    total,
    Array.from({ length: parts }, () => 1),
  )

// -------------------------------------------------------------- formatação

// Memoizado em módulo: criar o formatter por render custa caro em listas.
const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const BRL_NO_CENTS = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Formata em BRL usando o sinal de menos tipográfico (U+2212), não o hífen:
 * ele tem a mesma largura do dígito tabular e mantém a coluna alinhada.
 */
export function formatBRL(
  value: Cents,
  options: { hideCentsWhenZero?: boolean } = {},
): string {
  const useNoCents = options.hideCentsWhenZero === true && value % 100 === 0
  const formatter = useNoCents ? BRL_NO_CENTS : BRL
  return formatter.format(value / 100).replace('-', '−')
}

/** `1000` vira `"10%"`, `1050` vira `"10,5%"`. */
export function formatRate(rate: BasisPoints): string {
  return `${String(rate / 100).replace('.', ',')}%`
}

// ----------------------------------------------------------------- schemas

export const centsSchema = z
  .number()
  .int()
  .min(-MAX_CENTS)
  .max(MAX_CENTS)
  .transform((value) => value as Cents)

export const positiveCentsSchema = z
  .number()
  .int()
  .positive()
  .max(MAX_CENTS)
  .transform((value) => value as Cents)

export const nonNegativeCentsSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_CENTS)
  .transform((value) => value as Cents)

export const basisPointsSchema = z
  .number()
  .int()
  .min(0)
  .max(BP_SCALE)
  .transform((value) => value as BasisPoints)
