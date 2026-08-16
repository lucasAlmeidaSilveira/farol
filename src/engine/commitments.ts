import {
  add,
  allocateByWeights,
  applyRate,
  atLeastZero,
  basisPoints,
  type Cents,
  clamp,
  maxOf,
  minOf,
  splitEvenly,
  subtract,
  ZERO,
} from '@/domain/money'
import { monthsBetween, type Period } from '@/domain/period'
import type { Commitment, CommitmentBase } from '@/domain/types'
import { dueRuleOf } from '@/domain/types'

import type { CommitmentLine, CommitmentPartResult, IncomeLine } from './types'

/**
 * A apuração dos compromissos.
 *
 * O ponto mais delicado do app inteiro está aqui: o total é calculado com a
 * SOMA das alíquotas e só depois rateado entre as parcelas. Aplicar 10% e 5%
 * separadamente e somar pode divergir de aplicar 15% direto — e a diferença de
 * um centavo aparece na tela, ao lado do detalhamento que não fecha.
 */

export type Scenario = 'forecast' | 'considered'

const amountFor = (line: IncomeLine, scenario: Scenario): Cents =>
  scenario === 'forecast' ? line.forecastCents : line.consideredCents

/**
 * A base de cálculo de um compromisso proporcional.
 *
 * Para a Comunhão de Bens: fixas + variáveis, sem exclusões e sem desconto de
 * compromissos anteriores — ou seja, toda a renda do mês.
 */
export function calculateBase(
  base: CommitmentBase,
  lines: readonly IncomeLine[],
  scenario: Scenario,
  alreadyDeducted: Cents,
): Cents {
  const eligible = lines.filter((line) => {
    if (
      line.sourceId !== null &&
      base.excludedSourceIds.includes(line.sourceId)
    ) {
      return false
    }
    return line.kind === 'fixed' ? base.includeFixed : base.includeVariable
  })

  const gross = add(...eligible.map((line) => amountFor(line, scenario)))

  return base.netOfPriorCommitments
    ? atLeastZero(subtract(gross, alreadyDeducted))
    : gross
}

type Assessment = {
  readonly totalCents: Cents
  readonly baseCents: Cents
  readonly parts: readonly CommitmentPartResult[]
  readonly clampedBy: 'floor' | 'ceiling' | null
}

type AssessOneParams = {
  readonly commitment: Commitment
  readonly lines: readonly IncomeLine[]
  readonly scenario: Scenario
  readonly alreadyDeducted: Cents
  readonly period: Period
  readonly carriedCents: Cents
}

function assessOne({
  commitment,
  lines,
  scenario,
  alreadyDeducted,
  period,
  carriedCents,
}: AssessOneParams): Assessment {
  switch (commitment.type) {
    case 'fixedAmount':
      return {
        totalCents: commitment.amountCents,
        baseCents: ZERO,
        parts: [],
        clampedBy: null,
      }

    case 'proportional': {
      const baseCents = calculateBase(
        commitment.base,
        lines,
        scenario,
        alreadyDeducted,
      )

      const totalRate = basisPoints(
        commitment.parts.reduce((sum, part) => sum + part.rateBp, 0),
      )

      const gross = applyRate(baseCents, totalRate)
      const { value: totalCents, clampedBy } = clamp(
        gross,
        commitment.floorCents,
        commitment.ceilingCents,
      )

      // O rateio acontece DEPOIS do piso/teto, para que a soma das parcelas
      // continue igual ao total exibido mesmo quando o limite atuou.
      const amounts = allocateByWeights(
        totalCents,
        commitment.parts.map((part) => part.rateBp),
      )

      return {
        totalCents,
        baseCents,
        clampedBy,
        parts: commitment.parts.map((part, index) => ({
          id: part.id,
          label: part.label,
          rateBp: part.rateBp,
          amountCents: amounts[index] ?? ZERO,
        })),
      }
    }

    case 'savingsGoal': {
      const remaining = atLeastZero(
        subtract(commitment.targetCents, carriedCents),
      )
      // `max(1, ...)` cobre o prazo vencido: o que falta vira aporte deste mês.
      const monthsLeft = Math.max(
        1,
        monthsBetween(period, commitment.targetPeriod) + 1,
      )
      const perMonth = splitEvenly(remaining, monthsLeft)[0] ?? ZERO
      const floor = commitment.minContributionCents ?? ZERO

      return {
        totalCents: minOf(remaining, maxOf(perMonth, floor)),
        baseCents: ZERO,
        parts: [],
        clampedBy: null,
      }
    }
  }
}

type AssessCommitmentsParams = {
  /** Já materializados e ordenados por `order`. */
  readonly commitments: readonly Commitment[]
  readonly lines: readonly IncomeLine[]
  readonly period: Period
  readonly carriedByCommitment: Readonly<Record<string, Cents>>
  readonly settledByCommitment: Readonly<Record<string, Cents>>
}

/**
 * Percorre os compromissos uma única vez, na ordem de apuração, calculando os
 * dois cenários lado a lado.
 *
 * Cada cenário tem o seu próprio acumulador de "já descontado", porque um
 * compromisso com `netOfPriorCommitments` incide sobre o líquido — e o líquido
 * previsto não é o mesmo que o líquido considerado.
 */
export function assessCommitments({
  commitments,
  lines,
  period,
  carriedByCommitment,
  settledByCommitment,
}: AssessCommitmentsParams): CommitmentLine[] {
  let forecastDeducted = ZERO
  let consideredDeducted = ZERO

  const result: CommitmentLine[] = []

  for (const commitment of commitments) {
    const carriedCents = carriedByCommitment[commitment.id] ?? ZERO

    const forecast = assessOne({
      commitment,
      lines,
      scenario: 'forecast',
      alreadyDeducted: forecastDeducted,
      period,
      carriedCents,
    })

    const considered = assessOne({
      commitment,
      lines,
      scenario: 'considered',
      alreadyDeducted: consideredDeducted,
      period,
      carriedCents,
    })

    forecastDeducted = add(forecastDeducted, forecast.totalCents)
    consideredDeducted = add(consideredDeducted, considered.totalCents)

    const settledCents = settledByCommitment[commitment.id] ?? ZERO

    result.push({
      commitmentId: commitment.id,
      name: commitment.name,
      type: commitment.type,
      preset: commitment.preset,
      order: commitment.order,
      dueRule: dueRuleOf(commitment),
      baseCents: considered.baseCents,
      forecastCents: forecast.totalCents,
      consideredCents: considered.totalCents,
      parts: considered.parts,
      clampedBy: considered.clampedBy,
      settledCents,
      outstandingCents: atLeastZero(
        subtract(considered.totalCents, settledCents),
      ),
      overpaidCents: atLeastZero(subtract(settledCents, considered.totalCents)),
    })
  }

  return result
}
