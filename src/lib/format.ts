import { type Cents, formatBRL } from '@/domain/money'
import type { LocalDate, Period } from '@/domain/period'

/**
 * Formatação voltada para a tela. As regras de dinheiro em si vivem em
 * `domain/money`; aqui mora só o que é apresentação.
 */

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

/** `'2026-08'` vira `'agosto'`, ou `'agosto de 2026'` quando o ano é outro. */
export function formatPeriod(
  value: Period,
  options: { currentYear?: number } = {},
): string {
  const year = Number(value.slice(0, 4))
  const month = MONTHS[Number(value.slice(5, 7)) - 1] ?? ''
  return options.currentYear === year ? month : `${month} de ${year}`
}

/** `'2026-08-14'` vira `'14 de agosto'`. */
export function formatDate(value: LocalDate): string {
  const day = Number(value.slice(8, 10))
  const month = MONTHS[Number(value.slice(5, 7)) - 1] ?? ''
  return `${day} de ${month}`
}

/**
 * A leitura falada de um valor, para leitores de tela.
 *
 * O número visual usa separadores e o sinal tipográfico U+2212, que o leitor de
 * tela soletra de formas imprevisíveis. Esta versão é escrita para ser ouvida.
 */
export function spokenBRL(value: Cents): string {
  const negative = value < 0
  const absolute = Math.abs(value)
  const reais = Math.floor(absolute / 100)
  const centavos = absolute % 100

  const parts: string[] = []
  if (reais > 0 || centavos === 0) {
    parts.push(`${reais} ${reais === 1 ? 'real' : 'reais'}`)
  }
  if (centavos > 0) {
    parts.push(`${centavos} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  }

  return `${negative ? 'menos ' : ''}${parts.join(' e ')}`
}

/** O sinal explícito, sempre com U+2212 e nunca com hífen. */
export function signPrefix(
  value: Cents,
  mode: 'auto' | 'always' | 'never',
): string {
  if (mode === 'never') return ''
  if (value < 0) return '−'
  return mode === 'always' && value > 0 ? '+' : ''
}

/** O valor formatado sem sinal — o sinal é responsabilidade de `signPrefix`. */
export function formatAbsoluteBRL(
  value: Cents,
  options: { hideCentsWhenZero?: boolean } = {},
): string {
  return formatBRL(Math.abs(value) as Cents, options)
}

export function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}

export const formatDays = (count: number): string =>
  `${count} ${pluralize(count, 'dia', 'dias')}`
