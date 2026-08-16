import { describe, expect, it } from 'vitest'

import { basisPoints, cents } from '@/domain/money'
import { period } from '@/domain/period'
import { covenantPreset, savingsGoalDraft } from '@/domain/presets'
import type {
  Commitment,
  CommitmentId,
  IncomeSourceId,
  RecurrenceRule,
} from '@/domain/types'
import { covenant, fixedBill, plan, salary } from '~tests/fixtures'

import {
  isActiveIn,
  materializeCommitments,
  materializeIncomeSources,
} from './recurrence'

const monthly = (
  from: string,
  until: string | null = null,
): RecurrenceRule => ({
  from: period(from),
  until: until === null ? null : period(until),
  frequency: { type: 'monthly' },
})

describe('isActiveIn', () => {
  it('mensal respeita a janela de vigência', () => {
    const rule = monthly('2026-03', '2026-09')
    expect(isActiveIn(rule, period('2026-02'))).toBe(false)
    expect(isActiveIn(rule, period('2026-03'))).toBe(true)
    expect(isActiveIn(rule, period('2026-06'))).toBe(true)
    expect(isActiveIn(rule, period('2026-09'))).toBe(true)
    expect(isActiveIn(rule, period('2026-10'))).toBe(false)
  })

  it('sem `until`, vale indefinidamente', () => {
    expect(isActiveIn(monthly('2026-01'), period('2099-12'))).toBe(true)
  })

  it('anual só vale no mês escolhido — é o caso do 13º', () => {
    const thirteenth: RecurrenceRule = {
      from: period('2026-01'),
      until: null,
      frequency: { type: 'yearly', month: 12 },
    }
    expect(isActiveIn(thirteenth, period('2026-12'))).toBe(true)
    expect(isActiveIn(thirteenth, period('2027-12'))).toBe(true)
    expect(isActiveIn(thirteenth, period('2026-11'))).toBe(false)
  })

  it('a cada N meses conta a partir da âncora', () => {
    const quarterly: RecurrenceRule = {
      from: period('2026-01'),
      until: null,
      frequency: { type: 'everyNMonths', n: 3, anchor: period('2026-01') },
    }
    expect(isActiveIn(quarterly, period('2026-01'))).toBe(true)
    expect(isActiveIn(quarterly, period('2026-02'))).toBe(false)
    expect(isActiveIn(quarterly, period('2026-03'))).toBe(false)
    expect(isActiveIn(quarterly, period('2026-04'))).toBe(true)
    expect(isActiveIn(quarterly, period('2026-07'))).toBe(true)
  })

  it('a cada N meses não dispara antes da âncora', () => {
    // Sem o guarda de `delta >= 0`, o módulo negativo do JS acusaria vigência
    // em períodos anteriores à âncora.
    const quarterly: RecurrenceRule = {
      from: period('2025-01'),
      until: null,
      frequency: { type: 'everyNMonths', n: 3, anchor: period('2026-01') },
    }
    expect(isActiveIn(quarterly, period('2025-10'))).toBe(false)
    expect(isActiveIn(quarterly, period('2025-07'))).toBe(false)
  })
})

describe('materializeIncomeSources', () => {
  const target = period('2026-08')

  it('inclui a fonte vigente com a previsão original', () => {
    const result = materializeIncomeSources([salary()], target, null, new Set())
    expect(result).toHaveLength(1)
    expect(result[0]?.forecastApplies).toBe(true)
    expect(result[0]?.source.forecastCents).toBe(325_000)
  })

  it('exclui a fonte fora de vigência', () => {
    const ended = salary({ recurrence: monthly('2026-01', '2026-07') })
    expect(materializeIncomeSources([ended], target, null, new Set())).toEqual(
      [],
    )
  })

  it('exclui a fonte avulsa, sem recorrência', () => {
    const loose = salary({ recurrence: null })
    expect(materializeIncomeSources([loose], target, null, new Set())).toEqual(
      [],
    )
  })

  it('mantém a fonte encerrada que ainda recebeu dinheiro, mas zera a previsão', () => {
    // Arquivar uma fonte nunca pode apagar o histórico do mês.
    const ended = salary({ recurrence: monthly('2026-01', '2026-07') })
    const result = materializeIncomeSources(
      [ended],
      target,
      null,
      new Set(['src-salary']),
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.forecastApplies).toBe(false)
    expect(result[0]?.source.forecastCents).toBe(0)
  })

  it('aplica o ajuste de previsão do período', () => {
    const result = materializeIncomeSources(
      [salary()],
      target,
      plan({
        incomeSourceOverrides: {
          'src-salary': { active: null, forecastCents: cents(600_000) },
        },
      }),
      new Set(),
    )
    expect(result[0]?.source.forecastCents).toBe(600_000)
  })

  it('o ajuste pode ligar uma fonte que a regra desligaria', () => {
    const ended = salary({ recurrence: monthly('2026-01', '2026-07') })
    const result = materializeIncomeSources(
      [ended],
      target,
      plan({
        incomeSourceOverrides: {
          'src-salary': { active: true, forecastCents: null },
        },
      }),
      new Set(),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.forecastApplies).toBe(true)
  })
})

describe('materializeCommitments', () => {
  const target = period('2026-08')

  it('ordena por `order` e desempata por id, de forma determinística', () => {
    const result = materializeCommitments(
      [
        fixedBill('Zebra', 1000, { id: 'z' as CommitmentId, order: 5 }),
        fixedBill('Alfa', 1000, { id: 'a' as CommitmentId, order: 5 }),
        covenant({ order: 1 }),
      ],
      target,
      null,
    )
    expect(result.map((item) => item.id)).toEqual(['cmt-covenant', 'a', 'z'])
  })

  it('exclui compromisso fora de vigência', () => {
    const ended = covenant({ recurrence: monthly('2026-01', '2026-07') })
    expect(materializeCommitments([ended], target, null)).toEqual([])
  })

  it('ajuste sobrescreve o valor de um compromisso fixo', () => {
    const result = materializeCommitments(
      [fixedBill('Aluguel', 95_000, { id: 'rent' as CommitmentId })],
      target,
      plan({
        commitmentOverrides: {
          rent: {
            active: null,
            amountCents: cents(110_000),
            rateBpByPart: null,
            contributionCents: null,
          },
        },
      }),
    )
    const first = result[0]
    expect(first?.type === 'fixedAmount' && first.amountCents).toBe(110_000)
  })

  it('ajuste sobrescreve só as alíquotas informadas de um proporcional', () => {
    const result = materializeCommitments(
      [covenant()],
      target,
      plan({
        commitmentOverrides: {
          'cmt-covenant': {
            active: null,
            amountCents: null,
            rateBpByPart: { p1: basisPoints(2000) },
            contributionCents: null,
          },
        },
      }),
    )
    const first = result[0]
    expect(
      first?.type === 'proportional' && first.parts.map((part) => part.rateBp),
    ).toEqual([2000, 500])
  })

  it('proporcional sem ajuste de alíquota fica intacto', () => {
    const result = materializeCommitments([covenant()], target, plan())
    const first = result[0]
    expect(
      first?.type === 'proportional' && first.parts.map((part) => part.rateBp),
    ).toEqual([1000, 500])
  })

  it('ajuste sobrescreve o aporte mínimo de uma meta', () => {
    const goal = {
      ...savingsGoalDraft(
        period('2026-01'),
        'Viagem',
        cents(600_000),
        period('2027-01'),
      ),
      id: 'goal' as CommitmentId,
      memberId: null,
      archivedAt: null,
      createdAt: '',
      updatedAt: '',
    } as Commitment

    const result = materializeCommitments(
      [goal],
      target,
      plan({
        commitmentOverrides: {
          goal: {
            active: null,
            amountCents: null,
            rateBpByPart: null,
            contributionCents: cents(50_000),
          },
        },
      }),
    )
    const first = result[0]
    expect(first?.type === 'savingsGoal' && first.minContributionCents).toBe(
      50_000,
    )
  })

  it('exclui uma fonte da base pelo id', () => {
    const withExclusion = covenant({
      ...covenantPreset(period('2026-01')),
      id: 'cmt-covenant' as CommitmentId,
      base: {
        includeFixed: true,
        includeVariable: true,
        excludedSourceIds: ['src-salary' as IncomeSourceId],
        netOfPriorCommitments: false,
      },
    } as Partial<Commitment>)

    const result = materializeCommitments([withExclusion], target, null)
    const first = result[0]
    expect(
      first?.type === 'proportional' && first.base.excludedSourceIds,
    ).toEqual(['src-salary'])
  })
})
