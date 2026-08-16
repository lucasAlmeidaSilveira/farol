import { describe, expect, it } from 'vitest'

import { cents } from './money'
import { period } from './period'
import {
  alimonyPreset,
  bandMidpointCents,
  covenantPreset,
  fixedBillDraft,
  INCOME_BANDS,
  payYourselfFirstPreset,
  savingsGoalDraft,
  socialSecurityPreset,
  tithePreset,
} from './presets'
import { commitmentSchema } from './schemas'

const from = period('2026-01')

/** Todo preset precisa produzir um compromisso que passa no schema. */
const asCommitment = (draft: object) => ({
  ...draft,
  id: 'c1',
  memberId: null,
  archivedAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
})

describe('preset da Comunhão de Bens', () => {
  const preset = covenantPreset(from)

  it('é 10% + 5% sobre toda a renda do mês', () => {
    expect(preset.base).toEqual({
      includeFixed: true,
      includeVariable: true,
      excludedSourceIds: [],
      netOfPriorCommitments: false,
    })
    expect(preset.parts.map((part) => part.rateBp)).toEqual([1000, 500])
  })

  it('mantém ids estáveis, para sobreviver a renomeação de rótulo', () => {
    expect(preset.parts.map((part) => part.id)).toEqual(['p1', 'p2'])
  })

  it('produz um compromisso válido pelo schema', () => {
    expect(commitmentSchema.safeParse(asCommitment(preset)).success).toBe(true)
  })
})

describe('os demais presets', () => {
  it.each([
    ['dízimo', tithePreset(from)],
    ['pague-se primeiro', payYourselfFirstPreset(from, 1000)],
    ['INSS', socialSecurityPreset(from, cents(90_800))],
    ['pensão', alimonyPreset(from, 2000)],
    ['conta fixa', fixedBillDraft(from, 'Aluguel', cents(95_000), 10)],
    [
      'meta de reserva',
      savingsGoalDraft(from, 'Viagem', cents(600_000), period('2027-01')),
    ],
  ])('%s produz um compromisso válido', (_label, draft) => {
    expect(commitmentSchema.safeParse(asCommitment(draft)).success).toBe(true)
  })

  it('o INSS é apurado antes dos demais, para o líquido fazer sentido', () => {
    expect(socialSecurityPreset(from, cents(90_800)).order).toBeLessThan(
      alimonyPreset(from, 2000).order,
    )
    expect(alimonyPreset(from, 2000).order).toBeLessThan(
      covenantPreset(from).order,
    )
  })

  it('a pensão incide sobre o líquido de descontos anteriores', () => {
    expect(alimonyPreset(from, 2000).base.netOfPriorCommitments).toBe(true)
    expect(covenantPreset(from).base.netOfPriorCommitments).toBe(false)
  })

  it('a conta fixa aceita vencimento nulo', () => {
    expect(
      fixedBillDraft(from, 'Assinatura', cents(2_990), null).dueDay,
    ).toBeNull()
  })
})

describe('faixas de renda do onboarding', () => {
  it('são contíguas, sem buraco entre elas', () => {
    INCOME_BANDS.forEach((band, index) => {
      if (index === 0) return
      expect(band.minCents).toBe(INCOME_BANDS[index - 1]?.maxCents)
    })
  })

  it('o ponto médio cai dentro da faixa e é redondo', () => {
    for (const band of INCOME_BANDS) {
      const midpoint = bandMidpointCents(band)
      expect(midpoint).toBeGreaterThanOrEqual(band.minCents)
      expect(midpoint).toBeLessThanOrEqual(band.maxCents)
      // Múltiplo de R$ 10: um chute com centavos passaria falsa precisão.
      expect(midpoint % 1000).toBe(0)
    }
  })

  it('a faixa de 2.500 a 4.000 chuta R$ 3.250', () => {
    expect(bandMidpointCents({ minCents: 250_000, maxCents: 400_000 })).toBe(
      325_000,
    )
  })
})
