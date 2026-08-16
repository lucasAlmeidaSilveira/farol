import { describe, expect, it } from 'vitest'

import { applyRate, basisPoints, cents } from '@/domain/money'
import { freelance, makeInput, MID_MONTH, salary } from '~tests/fixtures'

import { computeMonth } from './compute'
import { simulateIncome } from './simulate'

describe('simulateIncome — o momento mágico da tela', () => {
  const input = makeInput({
    incomeSources: [salary(), freelance()],
    today: MID_MONTH,
  })

  const impact = simulateIncome(input, {
    amountCents: cents(100_000),
    sourceId: null,
    date: MID_MONTH,
    closesForecast: false,
  })

  it('mostra a Comunhão subindo 15% e a folga subindo 85%', () => {
    expect(impact.incomeCents).toBe(100_000)
    expect(impact.commitmentDeltaCents).toBe(15_000)
    expect(impact.availableDeltaCents).toBe(85_000)
  })

  it('mostra o antes e o depois de cada número', () => {
    expect(impact.commitmentBeforeCents).toBe(48_750)
    expect(impact.commitmentAfterCents).toBe(63_750)
    expect(impact.availableBeforeCents).toBe(276_250)
    expect(impact.availableAfterCents).toBe(361_250)
  })

  it('detalha o antes, o depois e o delta de cada compromisso', () => {
    // O antes e o depois vêm da engine, não são reconstruídos na tela: a UI
    // que tentasse deduzir o "antes" a partir do total erraria assim que
    // houvesse mais de um compromisso proporcional.
    expect(impact.byCommitment).toEqual([
      {
        commitmentId: 'cmt-covenant',
        name: 'Comunhão de Bens',
        beforeCents: 48_750,
        afterCents: 63_750,
        deltaCents: 15_000,
      },
    ])
  })

  it('atualiza a sugestão diária', () => {
    expect(impact.dailyPaceBeforeCents).not.toBe(impact.dailyPaceAfterCents)
  })
})

describe('a armadilha do delta', () => {
  /**
   * Este teste existe para impedir uma "otimização" que parece óbvia e está
   * errada: calcular o impacto como `applyRate(valorNovo)`.
   *
   * O arredondamento incide sobre o TOTAL, não sobre o incremento:
   *   base R$ 0,10 -> 15% = R$ 0,0150 -> R$ 0,02
   *   base R$ 0,20 -> 15% = R$ 0,0300 -> R$ 0,03
   * O compromisso subiu 1 centavo, mas 15% de R$ 0,10 isolado dá 2 centavos.
   */
  it('o delta real difere da alíquota aplicada sobre o incremento', () => {
    const input = makeInput({
      incomeSources: [salary({ forecastCents: cents(10) })],
    })

    const impact = simulateIncome(input, {
      amountCents: cents(10),
      sourceId: null,
      date: MID_MONTH,
      closesForecast: false,
    })

    expect(impact.commitmentBeforeCents).toBe(2)
    expect(impact.commitmentAfterCents).toBe(3)
    expect(impact.commitmentDeltaCents).toBe(1)

    // A conta ingênua daria 2. Se alguém trocar a implementação por ela,
    // este teste quebra.
    expect(applyRate(cents(10), basisPoints(1500))).toBe(2)
    expect(impact.commitmentDeltaCents).not.toBe(
      applyRate(cents(10), basisPoints(1500)),
    )
  })

  it('a simulação nunca mente sobre o que vai acontecer ao salvar', () => {
    // Varre bases que exercitam o arredondamento em todas as posições.
    for (let base = 1; base <= 400; base += 1) {
      for (const amount of [1, 3, 7, 33, 101]) {
        const input = makeInput({
          incomeSources: [salary({ forecastCents: cents(base) })],
        })

        const impact = simulateIncome(input, {
          amountCents: cents(amount),
          sourceId: null,
          date: MID_MONTH,
          closesForecast: false,
        })

        const actual = computeMonth({
          ...input,
          entries: [
            {
              id: 'x' as never,
              kind: 'income',
              period: input.period,
              periodIsManual: false,
              date: MID_MONTH,
              amountCents: cents(amount),
              description: '',
              sourceId: null,
              closesForecast: false,
              memberId: null,
              createdBy: 'm' as never,
              createdAt: '',
              updatedAt: '',
            },
          ],
        })

        expect(impact.availableAfterCents).toBe(
          actual.totals.remainingToSpendCents,
        )
        expect(impact.commitmentAfterCents).toBe(
          actual.totals.consideredCommitmentCents,
        )
      }
    }
  })
})
