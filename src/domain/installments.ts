import { type Cents, divideFloor } from './money'
import { addMonths, comparePeriods, monthsBetween, type Period } from './period'
import type { RecurrenceRule } from './types'

/**
 * Compra parcelada.
 *
 * NÃO existe tipo novo aqui. Uma compra em 12x é um compromisso de valor fixo
 * com vigência FECHADA: `from` no mês da primeira parcela, `until` no mês da
 * última. A engine já materializa apenas dentro da vigência (`isActiveIn`),
 * então a última parcela some do plano sozinha no mês seguinte — sem rotina de
 * limpeza, sem estado extra, sem documento que envelhece.
 *
 * É a mesma razão de uma recorrência nunca gerar documentos: 12 parcelas são 1
 * documento, não 12.
 */

/** Teto de sanidade: acima disso é erro de digitação, não compra. */
export const MAX_INSTALLMENTS = 120

/** O mês da última parcela. 12x começando em setembro terminam em agosto. */
export function installmentUntil(from: Period, count: number): Period {
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
    throw new RangeError(`Número de parcelas inválido: ${count}`)
  }
  return addMonths(from, count - 1)
}

/**
 * O valor de CADA parcela, arredondado para baixo.
 *
 * O modelo guarda um único valor mensal, então não dá para jogar o centavo que
 * sobra na última parcela, como a loja faz. Arredondar para baixo é a escolha
 * conservadora — o plano nunca reserva mais do que vai sair.
 *
 * A consequência precisa aparecer na tela: R$ 1.000 em 3x vira 3 × R$ 333,33 =
 * R$ 999,99. Quem mostra o total digitado ao lado de parcelas que não somam
 * aquilo está exibindo uma conta que não fecha.
 */
export function installmentAmount(totalCents: Cents, count: number): Cents {
  return divideFloor(totalCents, count)
}

export type InstallmentProgress = {
  /** 1 na primeira parcela. */
  readonly index: number
  readonly total: number
}

/**
 * Em que parcela o compromisso está, neste período.
 *
 * `null` quando não é parcelamento: vigência aberta (conta fixa comum) ou
 * periodicidade não mensal, onde "parcela 3 de 12" não descreveria nada.
 */
export function installmentProgress(
  rule: RecurrenceRule,
  period: Period,
): InstallmentProgress | null {
  if (rule.until === null) return null
  if (rule.frequency.type !== 'monthly') return null
  if (comparePeriods(period, rule.from) < 0) return null
  if (comparePeriods(period, rule.until) > 0) return null

  return {
    index: monthsBetween(rule.from, period) + 1,
    total: monthsBetween(rule.from, rule.until) + 1,
  }
}
