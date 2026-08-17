import { z } from 'zod'

/**
 * Datas no Farol são civis, não instantes.
 *
 * Um gasto às 23h de 31/08 em São Paulo é 02h de 01/09 em UTC. Se a data fosse
 * um `Date`, esse gasto cairia em setembro e o mês fecharia errado. Por isso
 * `LocalDate` é uma string 'YYYY-MM-DD', toda a aritmética roda em UTC puro
 * sobre ela, e `todayIn` é a ÚNICA fronteira do domínio com o relógio.
 *
 * Ambos os tipos ordenam lexicograficamente na mesma ordem que ordenam
 * cronologicamente — o que torna `sort()` e `where('period','==',x)` corretos
 * sem nenhuma conversão.
 */

declare const periodBrand: unique symbol
/** Mês de referência: 'YYYY-MM'. A unidade de agregação do app. */
export type Period = string & { readonly [periodBrand]: true }

declare const localDateBrand: unique symbol
/** Data civil, sem hora e sem fuso: 'YYYY-MM-DD'. */
export type LocalDate = string & { readonly [localDateBrand]: true }

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const LOCAL_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

const MS_PER_DAY = 86_400_000

const pad = (value: number): string => String(value).padStart(2, '0')

export function period(value: string): Period {
  if (!PERIOD_PATTERN.test(value)) {
    throw new RangeError(`Período inválido: ${value}`)
  }
  return value as Period
}

export function localDate(value: string): LocalDate {
  if (!LOCAL_DATE_PATTERN.test(value)) {
    throw new RangeError(`Data inválida: ${value}`)
  }
  return value as LocalDate
}

export const isPeriod = (value: string): boolean => PERIOD_PATTERN.test(value)

export const isLocalDate = (value: string): boolean =>
  LOCAL_DATE_PATTERN.test(value)

// ------------------------------------------------------------ aritmética de mês

export const makePeriod = (year: number, month: number): Period =>
  period(`${String(year).padStart(4, '0')}-${pad(month)}`)

export function yearMonth(value: Period): { year: number; month: number } {
  return {
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(5, 7)),
  }
}

export function addMonths(value: Period, count: number): Period {
  const { year, month } = yearMonth(value)
  const total = year * 12 + (month - 1) + count
  return makePeriod(Math.floor(total / 12), (total % 12) + 1)
}

export function monthsBetween(from: Period, to: Period): number {
  const a = yearMonth(from)
  const b = yearMonth(to)
  return (b.year - a.year) * 12 + (b.month - a.month)
}

export const comparePeriods = (a: Period, b: Period): -1 | 0 | 1 =>
  a < b ? -1 : a > b ? 1 : 0

/** Quantos dias tem o mês. `month` é 1-12. */
export const lastDayOfMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

// ----------------------------------------------------------- aritmética de dia

const toEpochDay = (value: LocalDate): number =>
  Date.UTC(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  ) / MS_PER_DAY

const fromEpochDay = (days: number): LocalDate => {
  const date = new Date(days * MS_PER_DAY)
  return localDate(
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
  )
}

export const addDays = (value: LocalDate, count: number): LocalDate =>
  fromEpochDay(toEpochDay(value) + count)

/** Dias de `from` até `to`. `daysBetween(x, x)` é 0. */
export const daysBetween = (from: LocalDate, to: LocalDate): number =>
  toEpochDay(to) - toEpochDay(from)

/** O mês do calendário em que a data cai, ignorando a configuração de ciclo. */
export const calendarPeriodOf = (value: LocalDate): Period =>
  period(value.slice(0, 7))

export const dayOfMonth = (value: LocalDate): number =>
  Number(value.slice(8, 10))

/**
 * Domingo é 0 e sábado é 6 — a base da grade de um calendário.
 *
 * 1970-01-01 caiu numa quinta, daí o deslocamento de 4. O resto duplo mantém o
 * resultado positivo para datas anteriores a 1970, onde `%` devolve negativo.
 */
export const weekdayOf = (value: LocalDate): number =>
  (((toEpochDay(value) + 4) % 7) + 7) % 7

// ------------------------------------------------------------------- ciclo

/**
 * Ponto de extensão do ciclo financeiro.
 *
 * O MVP suporta apenas `dayOfMonth`, que já cobre tanto "meu mês começa dia 1"
 * quanto "recebo dia 5" com o mesmo código. Fica documentado e NÃO implementado
 * o `businessDay`, que exigiria calendário de feriados nacionais e municipais.
 *
 * A união discriminada com um membro só é deliberada: implementar apenas o dia
 * 1 e generalizar depois obrigaria a reclassificar todos os lançamentos já
 * gravados — exatamente a migração que queremos evitar.
 */
export type CycleStart = { type: 'dayOfMonth'; day: number }

export const DEFAULT_CYCLE_START: CycleStart = { type: 'dayOfMonth', day: 1 }

export type Cycle = {
  readonly period: Period
  readonly start: LocalDate
  readonly end: LocalDate
  readonly totalDays: number
}

/** O dia D dentro de um mês, limitado ao último dia daquele mês. */
const startWithinMonth = (value: Period, day: number): LocalDate => {
  const { year, month } = yearMonth(value)
  return localDate(
    `${value}-${pad(Math.min(day, lastDayOfMonth(year, month)))}`,
  )
}

/**
 * O período 'YYYY-MM' começa no dia D desse mês e termina na véspera do dia D
 * do mês seguinte. D é limitado ao último dia de cada mês.
 *
 *   cycleFor('2026-08', { day: 1 })  -> 2026-08-01 .. 2026-08-31  (31 dias)
 *   cycleFor('2026-08', { day: 5 })  -> 2026-08-05 .. 2026-09-04  (31 dias)
 *   cycleFor('2026-01', { day: 31 }) -> 2026-01-31 .. 2026-02-27  (28 dias)
 */
export function cycleFor(value: Period, cycleStart: CycleStart): Cycle {
  const start = startWithinMonth(value, cycleStart.day)
  const end = addDays(startWithinMonth(addMonths(value, 1), cycleStart.day), -1)

  return {
    period: value,
    start,
    end,
    totalDays: daysBetween(start, end) + 1,
  }
}

/**
 * A inversa de `cycleFor`: a que período esta data pertence?
 *
 * Vale a invariante, verificada por property test:
 *   isWithinCycle(d, cycleFor(periodOf(d, s), s)) === true, para todo d e s.
 */
export function periodOf(value: LocalDate, cycleStart: CycleStart): Period {
  const calendar = calendarPeriodOf(value)
  const { year, month } = yearMonth(calendar)
  const limit = Math.min(cycleStart.day, lastDayOfMonth(year, month))

  return dayOfMonth(value) >= limit ? calendar : addMonths(calendar, -1)
}

export const isWithinCycle = (value: LocalDate, cycle: Cycle): boolean =>
  value >= cycle.start && value <= cycle.end

// ------------------------------------------------------------------ relógio

/**
 * A ÚNICA função do domínio que lê o relógio. Todo o resto — em especial a
 * engine — recebe `today` injetado, para que o cálculo seja determinístico e
 * testável sem congelar o tempo.
 */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  // 'en-CA' formata como YYYY-MM-DD, que é exatamente o formato de LocalDate.
  return localDate(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now),
  )
}

// ----------------------------------------------------------------- schemas

export const periodSchema = z
  .string()
  .regex(PERIOD_PATTERN, 'Período precisa estar no formato AAAA-MM')
  .transform((value) => value as Period)

export const localDateSchema = z
  .string()
  .regex(LOCAL_DATE_PATTERN, 'Data precisa estar no formato AAAA-MM-DD')
  .transform((value) => value as LocalDate)

export const cycleStartSchema = z.object({
  type: z.literal('dayOfMonth'),
  day: z.number().int().min(1).max(31),
})
