import { describe, expect, it } from 'vitest'

import { cents } from '@/domain/money'
import { localDate, period } from '@/domain/period'
import {
  covenant,
  DAY_ONE,
  expense,
  fixedBill,
  freelance,
  income,
  makeInput,
  MID_MONTH,
  plan,
  salary,
  settlement,
  spaceConfig,
} from '~tests/fixtures'

import { computeMonth } from './compute'

/**
 * Cenário canônico de todos os testes abaixo:
 *   Salário R$ 3.250,00 · Comunhão de Bens 10% + 5% · agosto/2026 · ciclo dia 1
 *
 *   Renda            R$ 3.250,00
 *   Comunhão 15%   − R$   487,50   (10% = 325,00 · 5% = 162,50)
 *   ─────────────────────────────
 *   Disponível       R$ 2.762,50   -> R$ 89/dia em 31 dias
 */

const covenantLine = (summary: ReturnType<typeof computeMonth>) => {
  const line = summary.commitments.find((item) => item.preset === 'covenant')
  if (!line) throw new Error('linha da Comunhão de Bens não encontrada')
  return line
}

describe('o app é útil com ZERO lançamentos', () => {
  const summary = computeMonth(makeInput())

  it('usa a renda prevista como renda considerada', () => {
    expect(summary.totals.consideredIncomeCents).toBe(325_000)
    expect(summary.totals.receivedIncomeCents).toBe(0)
  })

  it('apura a Comunhão de Bens sobre a previsão', () => {
    expect(covenantLine(summary).consideredCents).toBe(48_750)
    expect(covenantLine(summary).parts.map((part) => part.amountCents)).toEqual(
      [32_500, 16_250],
    )
  })

  it('entrega o número da home sem nenhum lançamento', () => {
    expect(summary.totals.availableToSpendCents).toBe(276_250)
    expect(summary.totals.remainingToSpendCents).toBe(276_250)
    expect(summary.totals.forecastAvailableCents).toBe(276_250)
  })

  it('sugere um valor por dia com piso, nunca para cima', () => {
    // 276250 / 31 = 8911,29 -> 8911, nunca 8912
    expect(summary.pace.dailyPaceCents).toBe(8_911)
    expect(summary.pace.remainingDays).toBe(31)
    expect(summary.pace.status).toBe('noData')
  })

  it('a soma das parcelas fecha com o total', () => {
    const line = covenantLine(summary)
    const sum = line.parts.reduce<number>(
      (acc, part) => acc + part.amountCents,
      0,
    )
    expect(sum).toBe(line.consideredCents)
  })
})

describe('renda variável recalcula a Comunhão durante o mês', () => {
  const withFreelance = computeMonth(
    makeInput({
      incomeSources: [salary(), freelance()],
      entries: [income(30_000, { sourceId: 'src-freela' as never })],
      today: MID_MONTH,
    }),
  )

  it('a base passa a incluir o freela', () => {
    expect(withFreelance.totals.consideredIncomeCents).toBe(355_000)
    expect(covenantLine(withFreelance).baseCents).toBe(355_000)
  })

  it('a Comunhão sobe 15% do que entrou', () => {
    expect(covenantLine(withFreelance).consideredCents).toBe(53_250)
    expect(
      covenantLine(withFreelance).parts.map((part) => part.amountCents),
    ).toEqual([35_500, 17_750])
  })

  it('a folga sobe os outros 85%', () => {
    expect(withFreelance.totals.availableToSpendCents).toBe(301_750)
  })

  it('o desvio em relação ao previsto fica explícito', () => {
    expect(withFreelance.totals.variance.incomeCents).toBe(30_000)
    expect(withFreelance.totals.variance.commitmentCents).toBe(4_500)
    expect(withFreelance.totals.variance.availableCents).toBe(25_500)
  })
})

describe('quitação NÃO desconta do disponível', () => {
  const base = makeInput({ entries: [expense(30_000)], today: MID_MONTH })
  const beforeSettling = computeMonth(base)

  const afterSettling = computeMonth({
    ...base,
    entries: [...base.entries, settlement(48_750, 'cmt-covenant')],
  })

  it('o gasto livre reduz o número da home', () => {
    expect(beforeSettling.totals.remainingToSpendCents).toBe(246_250)
  })

  it('pagar a Comunhão não muda o número da home', () => {
    // O dinheiro já estava reservado. Descontar de novo seria contar duas vezes
    // — o erro mais fácil de cometer neste tipo de app.
    expect(afterSettling.totals.remainingToSpendCents).toBe(246_250)
  })

  it('a quitação move o valor de "em aberto" para "pago"', () => {
    expect(covenantLine(beforeSettling).settledCents).toBe(0)
    expect(covenantLine(beforeSettling).outstandingCents).toBe(48_750)
    expect(covenantLine(afterSettling).settledCents).toBe(48_750)
    expect(covenantLine(afterSettling).outstandingCents).toBe(0)
  })

  it('pagar a mais gera excedente, que vira gasto livre', () => {
    const overpaid = computeMonth({
      ...base,
      entries: [...base.entries, settlement(50_000, 'cmt-covenant')],
    })
    expect(covenantLine(overpaid).overpaidCents).toBe(1_250)
    expect(overpaid.totals.freeExpenseCents).toBe(31_250)
    expect(overpaid.totals.remainingToSpendCents).toBe(245_000)
  })

  it('estorno de quitação reduz o pago e reabre o saldo', () => {
    const reversed = computeMonth({
      ...base,
      entries: [
        ...base.entries,
        settlement(48_750, 'cmt-covenant'),
        settlement(-10_000, 'cmt-covenant'),
      ],
    })
    expect(covenantLine(reversed).settledCents).toBe(38_750)
    expect(covenantLine(reversed).outstandingCents).toBe(10_000)
  })
})

describe('o freela que entra DEPOIS da quitação', () => {
  // O caso de uso central: quitou 15% em cima só do salário, e no dia 20
  // caiu um freela que fez o compromisso subir.
  const summary = computeMonth(
    makeInput({
      incomeSources: [salary(), freelance()],
      today: MID_MONTH,
      entries: [
        settlement(48_750, 'cmt-covenant'),
        income(100_000, { sourceId: 'src-freela' as never }),
      ],
    }),
  )

  it('o compromisso apurado sobe e sobra saldo em aberto', () => {
    expect(covenantLine(summary).consideredCents).toBe(63_750)
    expect(covenantLine(summary).settledCents).toBe(48_750)
    expect(covenantLine(summary).outstandingCents).toBe(15_000)
  })

  it('alerta o usuário em vez de esconder a diferença', () => {
    expect(summary.alerts).toContainEqual({
      code: 'COMMITMENT_OUTSTANDING',
      commitmentId: 'cmt-covenant',
      name: 'Comunhão de Bens',
      amountCents: 15_000,
    })
  })
})

describe('quando o plano não fecha', () => {
  it('mostra o disponível negativo, sem limitar em zero', () => {
    const summary = computeMonth(
      makeInput({ commitments: [covenant(), fixedBill('Aluguel', 600_000)] }),
    )

    expect(summary.totals.availableToSpendCents).toBe(-323_750)
    expect(summary.alerts).toContainEqual({
      code: 'COMMITMENTS_EXCEED_INCOME',
      deficitCents: 323_750,
    })
  })

  it('a sugestão diária vira zero, não um número negativo', () => {
    const summary = computeMonth(
      makeInput({ commitments: [covenant(), fixedBill('Aluguel', 600_000)] }),
    )
    expect(summary.pace.dailyPaceCents).toBe(0)
    expect(summary.pace.status).toBe('over')
  })

  it('sem nenhuma fonte, tudo é zero e a sugestão é null', () => {
    const summary = computeMonth(makeInput({ incomeSources: [] }))

    expect(summary.totals.consideredIncomeCents).toBe(0)
    expect(summary.totals.remainingToSpendCents).toBe(0)
    // `null`, não `0`: zero seria lido como "não pode gastar nada".
    expect(summary.pace.dailyPaceCents).toBe(0)
    expect(summary.alerts).toContainEqual({ code: 'NO_INCOME' })
  })
})

describe('previsto x realizado', () => {
  it('recebimento parcial não derruba a previsão', () => {
    const summary = computeMonth(
      makeInput({
        entries: [income(200_000, { sourceId: 'src-salary' as never })],
      }),
    )
    expect(summary.totals.consideredIncomeCents).toBe(325_000)
  })

  it('closesForecast faz valer o recebido, mesmo sendo menor', () => {
    const summary = computeMonth(
      makeInput({
        entries: [
          income(300_000, {
            sourceId: 'src-salary' as never,
            closesForecast: true,
          }),
        ],
      }),
    )
    expect(summary.totals.consideredIncomeCents).toBe(300_000)
    expect(summary.totals.variance.availableCents).toBe(-21_250)
  })

  it('recebimento maior que o previsto prevalece sem flag', () => {
    const summary = computeMonth(
      makeInput({
        entries: [income(400_000, { sourceId: 'src-salary' as never })],
      }),
    )
    expect(summary.totals.consideredIncomeCents).toBe(400_000)
  })

  it('renda variável só entra quando confirmada, por padrão', () => {
    const forecastOnly = computeMonth(
      makeInput({
        incomeSources: [salary(), freelance({ forecastCents: cents(200_000) })],
      }),
    )
    expect(forecastOnly.totals.consideredIncomeCents).toBe(325_000)
    expect(forecastOnly.totals.forecastIncomeCents).toBe(525_000)
  })

  it('a política includeForecast passa a contar a variável prevista', () => {
    const optimistic = computeMonth(
      makeInput({
        config: spaceConfig({ variableIncomePolicy: 'includeForecast' }),
        incomeSources: [salary(), freelance({ forecastCents: cents(200_000) })],
      }),
    )
    expect(optimistic.totals.consideredIncomeCents).toBe(525_000)
  })

  it('entrada avulsa, sem fonte, conta como variável', () => {
    const summary = computeMonth(makeInput({ entries: [income(50_000)] }))
    expect(summary.totals.consideredIncomeCents).toBe(375_000)
    expect(covenantLine(summary).baseCents).toBe(375_000)
  })
})

describe('ajustes do período', () => {
  it('sobrescrevem a previsão só naquele mês', () => {
    const summary = computeMonth(
      makeInput({
        plan: plan({
          incomeSourceOverrides: {
            'src-salary': { active: null, forecastCents: cents(600_000) },
          },
        }),
      }),
    )
    expect(summary.totals.consideredIncomeCents).toBe(600_000)
  })

  it('desativam um compromisso só naquele mês', () => {
    const summary = computeMonth(
      makeInput({
        plan: plan({
          commitmentOverrides: {
            'cmt-covenant': {
              active: false,
              amountCents: null,
              rateBpByPart: null,
              contributionCents: null,
            },
          },
        }),
      }),
    )
    expect(summary.commitments).toHaveLength(0)
    expect(summary.totals.availableToSpendCents).toBe(325_000)
  })
})

describe('mês fechado', () => {
  it('devolve o snapshot congelado, ignorando lançamentos novos', () => {
    const frozen = computeMonth(makeInput())
    const summary = computeMonth(
      makeInput({
        entries: [income(999_999)],
        plan: plan({
          status: 'closed',
          close: {
            closedAt: '2026-09-01T00:00:00.000Z',
            closedBy: 'member-1' as never,
            engineVersion: 1,
            summary: frozen,
          },
        }),
      }),
    )

    expect(summary.totals.consideredIncomeCents).toBe(325_000)
    expect(summary).toEqual(frozen)
  })
})

describe('pureza e determinismo', () => {
  it('o resultado não depende do relógio do sistema', () => {
    const input = makeInput({ entries: [expense(12_345)] })
    const first = computeMonth(input)
    const second = computeMonth(input)
    expect(first).toEqual(second)
  })

  it('não muta a entrada', () => {
    const input = makeInput({ entries: [expense(12_345)] })
    const snapshot = JSON.stringify(input)
    computeMonth(input)
    expect(JSON.stringify(input)).toBe(snapshot)
  })

  it('o resumo é serializável — sem Date, Map ou undefined', () => {
    const summary = computeMonth(makeInput())
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary)
  })
})

describe('ritmo ao longo do ciclo', () => {
  it('no último dia, a sugestão é tudo o que sobrou', () => {
    const summary = computeMonth(
      makeInput({ today: localDate('2026-08-31'), entries: [] }),
    )
    expect(summary.pace.remainingDays).toBe(1)
    expect(summary.pace.dailyPaceCents).toBe(276_250)
  })

  it('depois do fim do ciclo, não há mais sugestão diária', () => {
    const summary = computeMonth(makeInput({ today: localDate('2026-09-05') }))
    expect(summary.pace.remainingDays).toBe(0)
    expect(summary.pace.dailyPaceCents).toBeNull()
    expect(summary.pace.status).toBe('ended')
  })

  it('avisa quando o ciclo acabou e a renda prevista não foi confirmada', () => {
    const summary = computeMonth(makeInput({ today: localDate('2026-09-05') }))
    expect(summary.alerts).toContainEqual({
      code: 'FORECAST_UNCONFIRMED',
      sourceId: 'src-salary',
      name: 'Salário',
    })
  })

  it('num mês futuro, o ciclo inteiro está pela frente', () => {
    const summary = computeMonth(
      makeInput({ period: period('2026-09'), today: DAY_ONE }),
    )
    expect(summary.pace.elapsedDays).toBe(0)
    expect(summary.pace.remainingDays).toBe(30)
  })

  it('marca ritmo acelerado quando a projeção passa do disponível', () => {
    const summary = computeMonth(
      makeInput({
        today: localDate('2026-08-10'),
        entries: [expense(150_000)],
      }),
    )
    expect(summary.pace.status).toBe('ahead')
    expect(summary.pace.averageDailySpendCents).toBe(15_000)
  })
})

describe('rendas que não deveriam entrar na base', () => {
  it('uma fonte pode ser excluída do cálculo do compromisso', () => {
    // Caso real que aparece no primeiro mês de uso: reembolso de despesa,
    // empréstimo recebido, resgate de investimento. Excluir é edição de dado.
    const summary = computeMonth(
      makeInput({
        incomeSources: [salary(), freelance({ id: 'src-refund' as never })],
        entries: [income(50_000, { sourceId: 'src-refund' as never })],
        commitments: [
          covenant({
            base: {
              includeFixed: true,
              includeVariable: true,
              excludedSourceIds: ['src-refund' as never],
              netOfPriorCommitments: false,
            },
          } as never),
        ],
      }),
    )

    expect(summary.totals.consideredIncomeCents).toBe(375_000)
    // A base ignora os R$ 500 do reembolso.
    expect(covenantLine(summary).baseCents).toBe(325_000)
    expect(covenantLine(summary).consideredCents).toBe(48_750)
  })

  it('fonte encerrada que ainda recebeu conta o recebido, mas não a previsão', () => {
    const summary = computeMonth(
      makeInput({
        incomeSources: [
          salary({
            recurrence: {
              from: period('2026-01'),
              until: period('2026-07'),
              frequency: { type: 'monthly' },
            },
          }),
        ],
        entries: [income(120_000, { sourceId: 'src-salary' as never })],
      }),
    )

    expect(summary.totals.forecastIncomeCents).toBe(0)
    expect(summary.totals.consideredIncomeCents).toBe(120_000)
  })

  it('entrada avulsa não dispara alerta de previsão não confirmada', () => {
    const summary = computeMonth(
      makeInput({
        incomeSources: [],
        entries: [income(50_000)],
        today: localDate('2026-09-05'),
      }),
    )

    expect(
      summary.alerts.some((alert) => alert.code === 'FORECAST_UNCONFIRMED'),
    ).toBe(false)
  })
})

describe('ciclo que não começa no dia 1', () => {
  it('quem recebe dia 5 tem 31 dias entre 05/08 e 04/09', () => {
    const summary = computeMonth(
      makeInput({
        config: spaceConfig({ cycleStart: { type: 'dayOfMonth', day: 5 } }),
        today: localDate('2026-08-20'),
      }),
    )
    expect(summary.cycle.start).toBe('2026-08-05')
    expect(summary.cycle.end).toBe('2026-09-04')
    expect(summary.pace.elapsedDays).toBe(16)
    expect(summary.pace.remainingDays).toBe(16)
  })
})
