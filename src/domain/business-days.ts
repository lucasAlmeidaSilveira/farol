import {
  addDays,
  type LocalDate,
  localDate,
  type Period,
  weekdayOf,
  yearMonth,
} from './period'

/**
 * Dias úteis bancários no Brasil.
 *
 * "Quinto dia útil" é uma convenção de folha de pagamento e de compromissos
 * mensais — e NÃO é o mesmo que "dia 5". Em agosto de 2026, por exemplo, o dia
 * 5 é uma quarta-feira, mas o quinto dia útil é dia 7, porque o mês começa num
 * sábado.
 *
 * LIMITE CONHECIDO E DELIBERADO: só feriados NACIONAIS entram na conta.
 * Feriados estaduais e municipais variam por cidade e não têm fonte
 * computável — incluí-los exigiria uma base de dados por município, que
 * envelhece e erra. Onde houver feriado local, a data pode andar um dia. A UI
 * diz isso, em vez de fingir precisão que o cálculo não tem.
 *
 * Carnaval (segunda e terça) e Corpus Christi entram: não são feriados
 * nacionais no sentido estrito, mas são dias sem expediente bancário, e é o
 * calendário bancário que rege pagamento.
 */

/** Domingo de Páscoa, pelo algoritmo gregoriano anônimo (Meeus/Jones/Butcher). */
export function easterSunday(year: number): LocalDate {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return localDate(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  )
}

/** Feriados nacionais de data fixa. */
const FIXED = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Consciência Negra — nacional desde 2024
  '12-25', // Natal
] as const

/** Ano a partir do qual 20/11 é feriado nacional. */
const CONSCIENCIA_NEGRA_FROM = 2024

const cache = new Map<number, Set<string>>()

/** Todos os dias sem expediente bancário do ano, além dos fins de semana. */
export function bankHolidays(year: number): ReadonlySet<string> {
  const cached = cache.get(year)
  if (cached) return cached

  const easter = easterSunday(year)

  const dates = new Set<string>([
    ...FIXED.filter(
      (date) => date !== '11-20' || year >= CONSCIENCIA_NEGRA_FROM,
    ).map((date) => `${year}-${date}`),

    // Móveis, derivadas da Páscoa.
    addDays(easter, -48), // Carnaval, segunda
    addDays(easter, -47), // Carnaval, terça
    addDays(easter, -2), // Sexta-feira Santa
    addDays(easter, 60), // Corpus Christi
  ])

  cache.set(year, dates)
  return dates
}

export function isBusinessDay(date: LocalDate): boolean {
  const day = weekdayOf(date)
  if (day === 0 || day === 6) return false
  return !bankHolidays(Number(date.slice(0, 4))).has(date)
}

/** Quantos dias úteis o mês tem. Nenhum mês do calendário passa de 23. */
export function businessDaysInMonth(period: Period): number {
  let count = 0
  let cursor = localDate(`${period}-01`)

  while (cursor.startsWith(period)) {
    if (isBusinessDay(cursor)) count += 1
    cursor = addDays(cursor, 1)
  }

  return count
}

/**
 * O N-ésimo dia útil do mês.
 *
 * Se o mês tiver menos dias úteis que `n`, devolve o ÚLTIMO — a conta não pode
 * simplesmente deixar de ter data por causa de um mês atípico.
 *
 *   nthBusinessDay('2026-08', 5)  ->  2026-08-07
 *     (01/08 é sábado; os úteis são 3, 4, 5, 6, 7)
 */
export function nthBusinessDay(period: Period, n: number): LocalDate {
  const { year, month } = yearMonth(period)
  let cursor = localDate(`${period}-01`)
  let seen = 0
  let last = cursor

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const end = localDate(`${period}-${String(lastDay).padStart(2, '0')}`)

  while (cursor <= end) {
    if (isBusinessDay(cursor)) {
      seen += 1
      last = cursor
      if (seen === n) return cursor
    }
    cursor = addDays(cursor, 1)
  }

  return last
}

/** Rótulo curto para a UI: "5º dia útil". */
export const businessDayLabel = (n: number): string => `${n}º dia útil`
