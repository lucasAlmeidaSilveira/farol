import { add, ZERO } from '@/domain/money'
import type { MonthSummary } from '@/engine'

import type { Slice } from './allocation-bar'
import type { BeaconCardProps } from './beacon-card'

/**
 * O resumo do mês traduzido nas props do card do número principal.
 *
 * Vive fora da tela porque tem DOIS consumidores: a tela Hoje e o exemplo da
 * landing. Duplicar essa tradução significaria que um dia a página pública
 * mostraria o farol aceso onde o app mostra apagado — e a divergência
 * apareceria justamente para quem ainda não confia no produto.
 *
 * É pura de propósito: recebe o resumo, devolve props. Nenhum hook, nenhum
 * acesso ao relógio.
 */
export function beaconViewOf(
  summary: MonthSummary,
): Omit<BeaconCardProps, 'className'> {
  const proportional = proportionalLineOf(summary)

  const fixedTotal = add(
    ...summary.commitments
      .filter((line) => line.type !== 'proportional')
      .map((line) => line.consideredCents),
  )

  const slices: Slice[] = [
    {
      id: 'covenant',
      label: proportional?.name ?? 'Proporcional',
      amountCents: proportional?.consideredCents ?? ZERO,
    },
    { id: 'fixed', label: 'Contas fixas', amountCents: fixedTotal },
    {
      id: 'spent',
      label: 'Gastos',
      amountCents: summary.totals.freeExpenseCents,
    },
    {
      id: 'free',
      label: 'Livre',
      amountCents: summary.totals.remainingToSpendCents,
    },
  ]

  return {
    remainingCents: summary.totals.remainingToSpendCents,
    dailyPaceCents: summary.pace.dailyPaceCents,
    remainingDays: summary.pace.remainingDays,
    slices,
    // O farol apaga no vermelho e fica fraco para quem já está adiantado no
    // ritmo — cor, texto e forma dizem a mesma coisa dentro do card.
    state:
      summary.totals.remainingToSpendCents < 0
        ? 'out'
        : summary.pace.status === 'ahead'
          ? 'dim'
          : 'lit',
  }
}

/**
 * O compromisso proporcional do mês, se houver.
 *
 * O MVP tem no máximo um — é ele que ganha card próprio, com a fórmula aberta.
 * Mesma razão de estar aqui: a tela Hoje e a landing precisam olhar para a
 * mesma linha.
 */
export const proportionalLineOf = (
  summary: MonthSummary,
): MonthSummary['commitments'][number] | undefined =>
  summary.commitments.find((line) => line.type === 'proportional')
