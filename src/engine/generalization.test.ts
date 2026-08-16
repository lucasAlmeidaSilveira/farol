import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { cents } from '@/domain/money'
import { period } from '@/domain/period'
import {
  alimonyPreset,
  payYourselfFirstPreset,
  savingsGoalDraft,
  socialSecurityPreset,
  tithePreset,
} from '@/domain/presets'
import type { Commitment, CommitmentId } from '@/domain/types'
import { makeInput, salary } from '~tests/fixtures'

import { computeMonth } from './compute'

/**
 * A prova de que "Comunhão de Bens" é um PRESET e não uma regra de negócio
 * embutida no código.
 *
 * Se algum destes testes exigir uma linha nova na engine, a generalização
 * quebrou — e o próximo compromisso do usuário vai exigir deploy.
 */

const withAudit = (draft: object, id: string): Commitment =>
  ({
    ...draft,
    id: id as CommitmentId,
    memberId: null,
    archivedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }) as Commitment

const from = period('2026-01')

const lineOf = (summary: ReturnType<typeof computeMonth>, id: string) => {
  const line = summary.commitments.find((item) => item.commitmentId === id)
  if (!line) throw new Error(`compromisso ${id} não encontrado`)
  return line
}

describe('a engine não conhece nenhum compromisso pelo nome', () => {
  const ENGINE_DIR = join(process.cwd(), 'src/engine')
  const FORBIDDEN = /comunh|dizim|dízim|tithe|covenant|inss|pens[ãa]o/i

  /**
   * Comentários são removidos de propósito: eles PODEM citar a Comunhão de
   * Bens, porque explicam o caso que motivou a regra. O que não pode é o
   * código executável mencionar um compromisso concreto.
   */
  const stripComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  const engineFiles = readdirSync(ENGINE_DIR)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map((file) => join(ENGINE_DIR, file))

  it.each(engineFiles)('%s não cita compromisso concreto no código', (file) => {
    expect(stripComments(readFileSync(file, 'utf8'))).not.toMatch(FORBIDDEN)
  })

  it('o resultado NÃO muda quando só o preset muda', () => {
    // A prova comportamental, mais forte que qualquer grep: `preset` é uma
    // etiqueta para a UI escolher ícone e texto. Se a engine passar a ramificar
    // por ela, este teste quebra.
    const presets = [
      'covenant',
      'tithe',
      'socialSecurity',
      'alimony',
      'payYourselfFirst',
      'custom',
    ] as const

    const results = presets.map((preset) =>
      JSON.stringify(
        computeMonth(
          makeInput({
            commitments: [
              withAudit({ ...tithePreset(from), preset }, 'same-shape'),
            ],
          }),
        ).totals,
      ),
    )

    expect(new Set(results).size).toBe(1)
  })

  it('o resultado NÃO muda quando só o nome muda', () => {
    const names = ['Comunhão de Bens', 'Dízimo', 'Qualquer coisa', '']

    const results = names.map((name) =>
      JSON.stringify(
        computeMonth(
          makeInput({
            commitments: [withAudit({ ...tithePreset(from), name }, 'x')],
          }),
        ).totals,
      ),
    )

    expect(new Set(results).size).toBe(1)
  })
})

describe('outros compromissos funcionam sem código novo', () => {
  it('dízimo: 10% sobre toda a renda, numa parcela só', () => {
    const summary = computeMonth(
      makeInput({ commitments: [withAudit(tithePreset(from), 'tithe')] }),
    )
    const line = lineOf(summary, 'tithe')

    expect(line.consideredCents).toBe(32_500)
    expect(line.parts).toHaveLength(1)
    expect(summary.totals.availableToSpendCents).toBe(292_500)
  })

  it('INSS: 11% da renda fixa, limitado ao teto', () => {
    const summary = computeMonth(
      makeInput({
        incomeSources: [salary({ forecastCents: cents(1_000_000) })],
        commitments: [
          withAudit(socialSecurityPreset(from, cents(90_800)), 'inss'),
        ],
      }),
    )
    const line = lineOf(summary, 'inss')

    // 11% de R$ 10.000 seria R$ 1.100, mas o teto corta em R$ 908.
    expect(line.consideredCents).toBe(90_800)
    expect(line.clampedBy).toBe('ceiling')
  })

  it('pague-se primeiro: percentual só da renda fixa', () => {
    const summary = computeMonth(
      makeInput({
        entries: [
          {
            id: 'e1' as never,
            kind: 'income',
            period: period('2026-08'),
            periodIsManual: false,
            date: '2026-08-14' as never,
            amountCents: cents(100_000),
            description: 'Freela',
            sourceId: null,
            closesForecast: false,
            memberId: null,
            createdBy: 'm' as never,
            createdAt: '',
            updatedAt: '',
          },
        ],
        commitments: [withAudit(payYourselfFirstPreset(from, 1000), 'save')],
      }),
    )

    // 10% de R$ 3.250 (fixa) — o freela de R$ 1.000 NÃO entra na base.
    expect(lineOf(summary, 'save').consideredCents).toBe(32_500)
  })

  it('pensão: incide sobre o líquido, depois do INSS', () => {
    const summary = computeMonth(
      makeInput({
        commitments: [
          withAudit(socialSecurityPreset(from, cents(90_800)), 'inss'),
          withAudit(alimonyPreset(from, 2000), 'alimony'),
        ],
      }),
    )

    // INSS: 11% de 325.000 = 35.750 (ordem 1)
    // Pensão: 20% de (325.000 − 35.750) = 20% de 289.250 = 57.850 (ordem 5)
    expect(lineOf(summary, 'inss').consideredCents).toBe(35_750)
    expect(lineOf(summary, 'alimony').baseCents).toBe(289_250)
    expect(lineOf(summary, 'alimony').consideredCents).toBe(57_850)
  })

  it('meta de reserva: divide o que falta pelos meses restantes', () => {
    const goal = withAudit(
      savingsGoalDraft(from, 'Viagem', cents(600_000), period('2027-01')),
      'goal',
    )

    const fresh = computeMonth(makeInput({ commitments: [goal] }))
    // 6 meses de agosto a janeiro: R$ 6.000 / 6 = R$ 1.000
    expect(lineOf(fresh, 'goal').consideredCents).toBe(100_000)

    const almostThere = computeMonth(
      makeInput({
        commitments: [goal],
        carriedByCommitment: { goal: cents(550_000) },
      }),
    )
    // Faltam R$ 500 em 6 meses -> R$ 83,34 (a sobra do rateio vai pro primeiro)
    expect(lineOf(almostThere, 'goal').consideredCents).toBe(8_334)

    const done = computeMonth(
      makeInput({
        commitments: [goal],
        carriedByCommitment: { goal: cents(600_000) },
      }),
    )
    expect(lineOf(done, 'goal').consideredCents).toBe(0)
  })

  it('meta de reserva: o aporte mínimo antecipa o alvo', () => {
    const goal = withAudit(
      {
        ...savingsGoalDraft(from, 'Viagem', cents(600_000), period('2027-01')),
        minContributionCents: cents(150_000),
      },
      'goal',
    )

    // A divisão daria R$ 1.000/mês, mas a pessoa quer guardar R$ 1.500.
    const summary = computeMonth(makeInput({ commitments: [goal] }))
    expect(lineOf(summary, 'goal').consideredCents).toBe(150_000)
  })

  it('meta de reserva: o aporte nunca passa do que ainda falta', () => {
    const goal = withAudit(
      {
        ...savingsGoalDraft(from, 'Viagem', cents(600_000), period('2027-01')),
        minContributionCents: cents(150_000),
      },
      'goal',
    )

    const summary = computeMonth(
      makeInput({
        commitments: [goal],
        carriedByCommitment: { goal: cents(590_000) },
      }),
    )
    // Faltam R$ 100: o aporte mínimo de R$ 1.500 não pode ultrapassar isso.
    expect(lineOf(summary, 'goal').consideredCents).toBe(10_000)
  })

  it('meta de reserva: os aportes somam exatamente o alvo ao longo do prazo', () => {
    const target = cents(100_000)
    const goal = withAudit(
      savingsGoalDraft(from, 'Reserva', target, period('2027-02')),
      'goal',
    )

    let carried = 0
    const periods = [
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ] as const

    for (const current of periods) {
      const summary = computeMonth(
        makeInput({
          period: period(current),
          commitments: [goal],
          carriedByCommitment: { goal: cents(carried) },
        }),
      )
      carried += lineOf(summary, 'goal').consideredCents
    }

    expect(carried).toBe(target)
  })
})
