import { describe, expect, it } from 'vitest'

import {
  basisPointsSchema,
  centsSchema,
  nonNegativeCentsSchema,
  positiveCentsSchema,
} from './money'
import { cycleStartSchema, localDateSchema, periodSchema } from './period'
import {
  categorySchema,
  commitmentBaseSchema,
  commitmentOverrideSchema,
  commitmentPartSchema,
  commitmentSchema,
  entrySchema,
  frequencySchema,
  incomeSourceOverrideSchema,
  incomeSourceSchema,
  memberSchema,
  parsePeriod,
  periodPlanSchema,
  recurrenceRuleSchema,
  spaceConfigSchema,
  spaceSchema,
} from './schemas'

const AUDIT = {
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

const MONTHLY = {
  from: '2026-01',
  until: null,
  frequency: { type: 'monthly' },
}

const ENTRY_COMMON = {
  id: 'e1',
  period: '2026-08',
  periodIsManual: false,
  date: '2026-08-14',
  description: 'Mercado',
  memberId: null,
  createdBy: 'm1',
  ...AUDIT,
}

describe('schemas de dinheiro', () => {
  it('centsSchema aceita inteiro dentro do teto de sanidade', () => {
    expect(centsSchema.parse(1234)).toBe(1234)
    expect(centsSchema.parse(-1234)).toBe(-1234)
    expect(centsSchema.safeParse(12.5).success).toBe(false)
    expect(centsSchema.safeParse('1234').success).toBe(false)
    expect(centsSchema.safeParse(2_000_000_000).success).toBe(false)
  })

  it('positiveCentsSchema recusa zero e negativo', () => {
    expect(positiveCentsSchema.parse(1)).toBe(1)
    expect(positiveCentsSchema.safeParse(0).success).toBe(false)
    expect(positiveCentsSchema.safeParse(-1).success).toBe(false)
  })

  it('nonNegativeCentsSchema aceita zero', () => {
    expect(nonNegativeCentsSchema.parse(0)).toBe(0)
    expect(nonNegativeCentsSchema.safeParse(-1).success).toBe(false)
  })

  it('basisPointsSchema vai de 0 a 100%', () => {
    expect(basisPointsSchema.parse(1500)).toBe(1500)
    expect(basisPointsSchema.parse(10_000)).toBe(10_000)
    expect(basisPointsSchema.safeParse(10_001).success).toBe(false)
    expect(basisPointsSchema.safeParse(-1).success).toBe(false)
  })
})

describe('schemas de data', () => {
  it('periodSchema e localDateSchema validam o formato', () => {
    expect(periodSchema.parse('2026-08')).toBe('2026-08')
    expect(periodSchema.safeParse('2026-13').success).toBe(false)
    expect(localDateSchema.parse('2026-08-14')).toBe('2026-08-14')
    expect(localDateSchema.safeParse('14/08/2026').success).toBe(false)
  })

  it('cycleStartSchema limita o dia a 1..31', () => {
    expect(cycleStartSchema.parse({ type: 'dayOfMonth', day: 5 })).toEqual({
      type: 'dayOfMonth',
      day: 5,
    })
    expect(
      cycleStartSchema.safeParse({ type: 'dayOfMonth', day: 32 }).success,
    ).toBe(false)
  })

  it('parsePeriod devolve null em vez de lançar', () => {
    expect(parsePeriod('2026-08')).toBe('2026-08')
    expect(parsePeriod('lixo')).toBeNull()
    expect(parsePeriod(null)).toBeNull()
    expect(parsePeriod(undefined)).toBeNull()
    expect(parsePeriod('')).toBeNull()
  })
})

describe('recorrência', () => {
  it('aceita as três periodicidades', () => {
    expect(frequencySchema.parse({ type: 'monthly' })).toEqual({
      type: 'monthly',
    })
    expect(frequencySchema.parse({ type: 'yearly', month: 12 })).toEqual({
      type: 'yearly',
      month: 12,
    })
    expect(
      frequencySchema.parse({
        type: 'everyNMonths',
        n: 3,
        anchor: '2026-01',
      }),
    ).toMatchObject({ type: 'everyNMonths', n: 3 })
  })

  it('recusa periodicidade desconhecida e N fora do intervalo', () => {
    expect(frequencySchema.safeParse({ type: 'weekly' }).success).toBe(false)
    expect(
      frequencySchema.safeParse({
        type: 'everyNMonths',
        n: 1,
        anchor: '2026-01',
      }).success,
    ).toBe(false)
  })

  it('recusa vigência que termina antes de começar', () => {
    const result = recurrenceRuleSchema.safeParse({
      from: '2026-09',
      until: '2026-03',
      frequency: { type: 'monthly' },
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('anterior ao início')
  })

  it('aceita vigência válida e aberta', () => {
    expect(recurrenceRuleSchema.safeParse(MONTHLY).success).toBe(true)
    expect(
      recurrenceRuleSchema.safeParse({ ...MONTHLY, until: '2026-12' }).success,
    ).toBe(true)
    expect(
      recurrenceRuleSchema.safeParse({ ...MONTHLY, until: '2026-01' }).success,
    ).toBe(true)
  })
})

describe('Space e Member', () => {
  const config = {
    cycleStart: { type: 'dayOfMonth', day: 1 },
    variableIncomePolicy: 'confirmedOnly',
    timeZone: 'America/Sao_Paulo',
    currency: 'BRL',
  }

  it('valida a configuração do espaço', () => {
    expect(spaceConfigSchema.safeParse(config).success).toBe(true)
    expect(
      spaceConfigSchema.safeParse({ ...config, currency: 'USD' }).success,
    ).toBe(false)
    expect(
      spaceConfigSchema.safeParse({ ...config, variableIncomePolicy: 'x' })
        .success,
    ).toBe(false)
  })

  it('valida o espaço', () => {
    const space = {
      id: 's1',
      name: 'Minha casa',
      config,
      createdBy: 'm1',
      ...AUDIT,
    }
    expect(spaceSchema.safeParse(space).success).toBe(true)
    expect(spaceSchema.safeParse({ ...space, name: '' }).success).toBe(false)
  })

  it('valida o membro e os papéis', () => {
    const member = {
      uid: 'm1',
      spaceId: 's1',
      role: 'owner',
      status: 'active',
      name: 'Lucas',
      email: null,
      photoUrl: null,
      ...AUDIT,
    }
    expect(memberSchema.safeParse(member).success).toBe(true)
    expect(memberSchema.safeParse({ ...member, role: 'admin' }).success).toBe(
      false,
    )
    expect(memberSchema.safeParse({ ...member, status: 'x' }).success).toBe(
      false,
    )
  })
})

describe('IncomeSource', () => {
  const source = {
    id: 'src1',
    name: 'Salário',
    kind: 'fixed',
    forecastCents: 325_000,
    confidence: 'estimated',
    recurrence: MONTHLY,
    expectedDay: 5,
    memberId: null,
    archivedAt: null,
    ...AUDIT,
  }

  it('aceita uma fonte válida', () => {
    expect(incomeSourceSchema.safeParse(source).success).toBe(true)
  })

  it('recusa renda prevista negativa', () => {
    expect(
      incomeSourceSchema.safeParse({ ...source, forecastCents: -1 }).success,
    ).toBe(false)
  })

  it('recusa dia de recebimento fora do mês', () => {
    expect(
      incomeSourceSchema.safeParse({ ...source, expectedDay: 32 }).success,
    ).toBe(false)
  })

  it('aceita recebimento por dia útil', () => {
    const parsed = incomeSourceSchema.safeParse({
      ...source,
      expectedDay: null,
      expectedBusinessDay: 5,
    })
    expect(parsed.success).toBe(true)
  })

  it('recusa dia útil acima de 23 — nenhum mês tem mais que isso', () => {
    expect(
      incomeSourceSchema.safeParse({
        ...source,
        expectedDay: null,
        expectedBusinessDay: 24,
      }).success,
    ).toBe(false)
  })

  it('recusa dia do mês e dia útil ao mesmo tempo', () => {
    expect(
      incomeSourceSchema.safeParse({ ...source, expectedBusinessDay: 5 })
        .success,
    ).toBe(false)
  })

  /*
    A garantia que impede a renda de sumir da tela: fontes gravadas antes de
    `expectedBusinessDay` existir não têm a chave, e `parseSnapshot` descarta
    documento que não valida.
  */
  it('aceita fonte antiga, sem a chave de dia útil, normalizando para null', () => {
    const parsed = incomeSourceSchema.safeParse(source)
    expect(parsed.success).toBe(true)
    expect(parsed.data?.expectedBusinessDay).toBeNull()
  })

  it('aceita fonte avulsa, sem recorrência', () => {
    expect(
      incomeSourceSchema.safeParse({ ...source, recurrence: null }).success,
    ).toBe(true)
  })
})

describe('Commitment', () => {
  const common = {
    id: 'c1',
    name: 'Comunhão de Bens',
    description: null,
    order: 10,
    recurrence: MONTHLY,
    preset: 'covenant',
    memberId: null,
    archivedAt: null,
    dueDay: null,
    dueBusinessDay: null,
    ...AUDIT,
  }

  const base = {
    includeFixed: true,
    includeVariable: true,
    excludedSourceIds: [],
    netOfPriorCommitments: false,
  }

  it('a base precisa incluir ao menos um tipo de renda', () => {
    expect(commitmentBaseSchema.safeParse(base).success).toBe(true)
    expect(
      commitmentBaseSchema.safeParse({
        ...base,
        includeFixed: false,
        includeVariable: false,
      }).success,
    ).toBe(false)
  })

  it('valida uma parcela', () => {
    expect(
      commitmentPartSchema.safeParse({ id: 'p1', label: '10%', rateBp: 1000 })
        .success,
    ).toBe(true)
    expect(
      commitmentPartSchema.safeParse({ id: '', label: '10%', rateBp: 1000 })
        .success,
    ).toBe(false)
  })

  it('aceita o proporcional com duas parcelas', () => {
    expect(
      commitmentSchema.safeParse({
        ...common,
        type: 'proportional',
        base,
        parts: [
          { id: 'p1', label: 'Parcela 10%', rateBp: 1000 },
          { id: 'p2', label: 'Parcela 5%', rateBp: 500 },
        ],
        floorCents: null,
        ceilingCents: null,
      }).success,
    ).toBe(true)
  })

  it('recusa ids de parcela duplicados', () => {
    const result = commitmentSchema.safeParse({
      ...common,
      type: 'proportional',
      base,
      parts: [
        { id: 'p1', label: 'A', rateBp: 1000 },
        { id: 'p1', label: 'B', rateBp: 500 },
      ],
      floorCents: null,
      ceilingCents: null,
    })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('duplicados')
  })

  it('recusa soma de alíquotas acima de 100%', () => {
    const result = commitmentSchema.safeParse({
      ...common,
      type: 'proportional',
      base,
      parts: [
        { id: 'p1', label: 'A', rateBp: 9000 },
        { id: 'p2', label: 'B', rateBp: 2000 },
      ],
      floorCents: null,
      ceilingCents: null,
    })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('100%')
  })

  it('recusa proporcional sem nenhuma parcela', () => {
    expect(
      commitmentSchema.safeParse({
        ...common,
        type: 'proportional',
        base,
        parts: [],
        floorCents: null,
        ceilingCents: null,
      }).success,
    ).toBe(false)
  })

  it('aceita o valor fixo', () => {
    expect(
      commitmentSchema.safeParse({
        ...common,
        preset: 'custom',
        type: 'fixedAmount',
        amountCents: 95_000,
        dueDay: 10,
      }).success,
    ).toBe(true)
  })

  it('aceita a meta de reserva e exige alvo positivo', () => {
    const goal = {
      ...common,
      preset: 'custom',
      type: 'savingsGoal',
      targetCents: 600_000,
      targetPeriod: '2027-01',
      minContributionCents: null,
    }
    expect(commitmentSchema.safeParse(goal).success).toBe(true)
    expect(
      commitmentSchema.safeParse({ ...goal, targetCents: 0 }).success,
    ).toBe(false)
  })

  it('recusa tipo desconhecido e preset desconhecido', () => {
    expect(
      commitmentSchema.safeParse({ ...common, type: 'weird' }).success,
    ).toBe(false)
    expect(
      commitmentSchema.safeParse({
        ...common,
        preset: 'weird',
        type: 'fixedAmount',
        amountCents: 1,
        dueDay: null,
      }).success,
    ).toBe(false)
  })
})

describe('Entry', () => {
  it('renda precisa ser positiva', () => {
    const income = {
      ...ENTRY_COMMON,
      kind: 'income',
      amountCents: 100_000,
      sourceId: null,
      closesForecast: false,
    }
    expect(entrySchema.safeParse(income).success).toBe(true)
    expect(entrySchema.safeParse({ ...income, amountCents: -1 }).success).toBe(
      false,
    )
    expect(entrySchema.safeParse({ ...income, amountCents: 0 }).success).toBe(
      false,
    )
  })

  it('gasto aceita negativo (estorno), mas nunca zero', () => {
    const expense = {
      ...ENTRY_COMMON,
      kind: 'expense',
      amountCents: 18_240,
      categoryId: null,
    }
    expect(entrySchema.safeParse(expense).success).toBe(true)
    expect(
      entrySchema.safeParse({ ...expense, amountCents: -5000 }).success,
    ).toBe(true)
    expect(entrySchema.safeParse({ ...expense, amountCents: 0 }).success).toBe(
      false,
    )
  })

  it('quitação exige o compromisso', () => {
    const settlement = {
      ...ENTRY_COMMON,
      kind: 'settlement',
      amountCents: 48_750,
      commitmentId: 'c1',
      partId: null,
    }
    expect(entrySchema.safeParse(settlement).success).toBe(true)
    expect(
      entrySchema.safeParse({ ...settlement, commitmentId: '' }).success,
    ).toBe(false)
  })

  it('recusa valor em string ou float — o erro que centavos existem para evitar', () => {
    const expense = {
      ...ENTRY_COMMON,
      kind: 'expense',
      categoryId: null,
    }
    expect(
      entrySchema.safeParse({ ...expense, amountCents: '18240' }).success,
    ).toBe(false)
    expect(
      entrySchema.safeParse({ ...expense, amountCents: 182.4 }).success,
    ).toBe(false)
  })

  it('recusa período e data malformados', () => {
    const expense = {
      ...ENTRY_COMMON,
      kind: 'expense',
      amountCents: 100,
      categoryId: null,
    }
    expect(
      entrySchema.safeParse({ ...expense, period: '2026-13' }).success,
    ).toBe(false)
    expect(
      entrySchema.safeParse({ ...expense, date: '2026-08-32' }).success,
    ).toBe(false)
  })

  it('recusa kind desconhecido', () => {
    expect(
      entrySchema.safeParse({ ...ENTRY_COMMON, kind: 'transfer' }).success,
    ).toBe(false)
  })
})

describe('Category', () => {
  it('exige cor em hexadecimal de 6 dígitos', () => {
    const category = {
      id: 'cat1',
      name: 'Mercado',
      color: '#F5A524',
      essential: true,
      archivedAt: null,
    }
    expect(categorySchema.safeParse(category).success).toBe(true)
    expect(
      categorySchema.safeParse({ ...category, color: 'amber' }).success,
    ).toBe(false)
    expect(
      categorySchema.safeParse({ ...category, color: '#FFF' }).success,
    ).toBe(false)
  })
})

describe('PeriodPlan', () => {
  it('aceita um plano vazio, que é o caso comum', () => {
    expect(
      periodPlanSchema.safeParse({
        period: '2026-08',
        status: 'open',
        incomeSourceOverrides: {},
        commitmentOverrides: {},
        close: null,
        ...AUDIT,
      }).success,
    ).toBe(true)
  })

  it('aceita os ajustes e o snapshot de fechamento', () => {
    expect(
      periodPlanSchema.safeParse({
        period: '2026-08',
        status: 'closed',
        incomeSourceOverrides: {
          src1: { active: null, forecastCents: 600_000 },
        },
        commitmentOverrides: {
          c1: {
            active: false,
            amountCents: null,
            rateBpByPart: { p1: 2000 },
            contributionCents: null,
          },
        },
        close: {
          closedAt: '2026-09-01T00:00:00.000Z',
          closedBy: 'm1',
          engineVersion: 1,
          summary: { anything: true },
        },
        ...AUDIT,
      }).success,
    ).toBe(true)
  })

  it('valida os ajustes isoladamente', () => {
    expect(
      incomeSourceOverrideSchema.safeParse({
        active: true,
        forecastCents: null,
      }).success,
    ).toBe(true)
    expect(
      commitmentOverrideSchema.safeParse({
        active: null,
        amountCents: 100,
        rateBpByPart: null,
        contributionCents: null,
      }).success,
    ).toBe(true)
    expect(
      commitmentOverrideSchema.safeParse({
        active: null,
        amountCents: -100,
        rateBpByPart: null,
        contributionCents: null,
      }).success,
    ).toBe(false)
  })

  it('recusa status desconhecido', () => {
    expect(
      periodPlanSchema.safeParse({
        period: '2026-08',
        status: 'archived',
        incomeSourceOverrides: {},
        commitmentOverrides: {},
        close: null,
        ...AUDIT,
      }).success,
    ).toBe(false)
  })
})

describe('vencimento do compromisso', () => {
  const bill = {
    id: 'c1',
    type: 'fixedAmount' as const,
    name: 'Netflix',
    description: null,
    order: 100,
    recurrence: MONTHLY,
    preset: 'custom' as const,
    memberId: null,
    archivedAt: null,
    amountCents: 4490,
    dueDay: null as number | null,
    dueBusinessDay: null as number | null,
    ...AUDIT,
  }

  it('aceita sem vencimento — o campo é opcional', () => {
    expect(commitmentSchema.safeParse(bill).success).toBe(true)
  })

  it('aceita vencimento por dia do mês', () => {
    expect(commitmentSchema.safeParse({ ...bill, dueDay: 10 }).success).toBe(
      true,
    )
  })

  it('aceita vencimento por dia útil', () => {
    expect(
      commitmentSchema.safeParse({ ...bill, dueBusinessDay: 5 }).success,
    ).toBe(true)
  })

  it('RECUSA os dois preenchidos — a regra é excludente', () => {
    const result = commitmentSchema.safeParse({
      ...bill,
      dueDay: 10,
      dueBusinessDay: 5,
    })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('não os dois')
  })

  it('recusa dia do mês fora de 1..31', () => {
    expect(commitmentSchema.safeParse({ ...bill, dueDay: 32 }).success).toBe(
      false,
    )
    expect(commitmentSchema.safeParse({ ...bill, dueDay: 0 }).success).toBe(
      false,
    )
  })

  it('recusa dia útil acima de 23 — nenhum mês tem tantos', () => {
    expect(
      commitmentSchema.safeParse({ ...bill, dueBusinessDay: 24 }).success,
    ).toBe(false)
  })
})
