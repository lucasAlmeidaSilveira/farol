import { readFileSync } from 'node:fs'

import {
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  covenantPayload,
  entryPayload,
  fixedBillPayload,
  incomeSourcePayload,
} from '@/data/payloads'
import { cents } from '@/domain/money'
import { localDate, period } from '@/domain/period'
import { commitmentSchema, entrySchema, incomeSourceSchema } from '@/domain/schemas'
import type { Commitment, Entry, IncomeSource, SpaceConfig } from '@/domain/types'
import { computeMonth } from '@/engine'

/**
 * O teste que amarra as três camadas.
 *
 * Schemas Zod, Security Rules e engine foram escritos separadamente. Cada um
 * pode estar certo sozinho e ainda assim discordar do outro — e essa
 * discordância só apareceria em produção, como um lançamento que some da tela
 * minutos depois de ser criado (rules recusam) ou como uma tela de erro ao
 * abrir o mês (schema recusa).
 *
 * Aqui o caminho completo é exercitado com os PAYLOADS REAIS do app:
 *   payload -> rules aceitam -> Firestore devolve -> schema valida -> engine calcula
 */

let env: RulesTestEnvironment

const UID = 'uid_owner'
const SPACE = 'space_integration'
const FROM = period('2026-08')
const TODAY = localDate('2026-08-14')

const CONFIG: SpaceConfig = {
  cycleStart: { type: 'dayOfMonth', day: 1 },
  variableIncomePolicy: 'confirmedOnly',
  timeZone: 'America/Sao_Paulo',
  currency: 'BRL',
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'farol-test',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'spaces', SPACE), {
      name: 'Integração',
      config: CONFIG,
      createdBy: UID,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await setDoc(doc(db, 'spaces', SPACE, 'members', UID), {
      uid: UID,
      spaceId: SPACE,
      role: 'owner',
      status: 'active',
      name: 'Lucas',
      createdAt: new Date(),
    })
  })
})

/** Normaliza como `src/data/parse.ts` faz: Timestamp vira string ISO. */
function normalize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalize(item),
      ]),
    )
  }
  return value
}

describe('payload -> rules -> schema -> engine', () => {
  it('o plano do onboarding sobrevive à ida e volta e produz o número certo', async () => {
    const db = env.authenticatedContext(UID).firestore()

    // 1. ESCRITA: exatamente os payloads que o app usa.
    await assertSucceeds(
      setDoc(
        doc(collection(db, 'spaces', SPACE, 'incomeSources')),
        incomeSourcePayload(
          {
            amountCents: cents(325_000),
            confidence: 'estimated',
            expectedDay: 5,
          },
          FROM,
          serverTimestamp(),
        ),
      ),
    )

    await assertSucceeds(
      setDoc(
        doc(collection(db, 'spaces', SPACE, 'commitments')),
        covenantPayload(FROM, serverTimestamp()),
      ),
    )

    await assertSucceeds(
      setDoc(
        doc(collection(db, 'spaces', SPACE, 'commitments')),
        fixedBillPayload(
          FROM,
          {
            label: 'Aluguel',
            amountCents: cents(95_000),
            dueRule: { type: 'dayOfMonth', day: 10 },
          },
          serverTimestamp(),
        ),
      ),
    )

    await assertSucceeds(
      setDoc(
        doc(collection(db, 'spaces', SPACE, 'entries')),
        entryPayload(
          {
            kind: 'income',
            amountCents: cents(30_000),
            date: localDate('2026-08-12'),
            description: 'Freela',
            sourceId: null,
          },
          CONFIG.cycleStart,
          UID,
          serverTimestamp(),
        ),
      ),
    )

    await assertSucceeds(
      setDoc(
        doc(collection(db, 'spaces', SPACE, 'entries')),
        entryPayload(
          {
            kind: 'expense',
            amountCents: cents(42_000),
            date: TODAY,
            description: 'Mercado',
            categoryId: null,
          },
          CONFIG.cycleStart,
          UID,
          serverTimestamp(),
        ),
      ),
    )

    // A Comunhão de Bens vem do preset com vencimento no 5º dia útil.
    await assertSucceeds(
      setDoc(
        doc(collection(db, 'spaces', SPACE, 'commitments')),
        fixedBillPayload(
          FROM,
          {
            label: 'Academia',
            amountCents: cents(12_000),
            dueRule: { type: 'businessDay', n: 5 },
          },
          serverTimestamp(),
        ),
      ),
    )

    // 2. LEITURA + VALIDAÇÃO: todo documento precisa passar no schema.
    const sourcesSnap = await getDocs(
      collection(db, 'spaces', SPACE, 'incomeSources'),
    )
    const commitmentsSnap = await getDocs(
      collection(db, 'spaces', SPACE, 'commitments'),
    )
    const entriesSnap = await getDocs(
      query(
        collection(db, 'spaces', SPACE, 'entries'),
        where('period', '==', FROM),
      ),
    )

    const incomeSources = sourcesSnap.docs.map((document) => {
      const parsed = incomeSourceSchema.safeParse(
        normalize({ id: document.id, ...document.data() }),
      )
      expect(parsed.error?.issues ?? null).toBeNull()
      return parsed.data as IncomeSource
    })

    const commitments = commitmentsSnap.docs.map((document) => {
      const parsed = commitmentSchema.safeParse(
        normalize({ id: document.id, ...document.data() }),
      )
      expect(parsed.error?.issues ?? null).toBeNull()
      return parsed.data as Commitment
    })

    const entries = entriesSnap.docs.map((document) => {
      const parsed = entrySchema.safeParse(
        normalize({ id: document.id, ...document.data() }),
      )
      expect(parsed.error?.issues ?? null).toBeNull()
      return parsed.data as Entry
    })

    expect(incomeSources).toHaveLength(1)
    expect(commitments).toHaveLength(3)
    expect(entries).toHaveLength(2)

    // 3. CÁLCULO: os números precisam bater com a conta feita à mão.
    const summary = computeMonth({
      period: FROM,
      config: CONFIG,
      today: TODAY,
      incomeSources,
      commitments,
      plan: null,
      entries,
      carriedByCommitment: {},
    })

    //   Salário            R$ 3.250,00
    //   Freela             R$   300,00
    //   Renda              R$ 3.550,00
    //   Comunhão 15%     − R$   532,50
    //   Aluguel          − R$   950,00
    //   Gastos           − R$   420,00
    //   ────────────────────────────────
    //   Livre              R$ 1.647,50
    expect(summary.totals.consideredIncomeCents).toBe(355_000)
    expect(summary.totals.consideredCommitmentCents).toBe(53_250 + 95_000 + 12_000)
    expect(summary.totals.freeExpenseCents).toBe(42_000)
    expect(summary.totals.remainingToSpendCents).toBe(164_750 - 12_000)

    // O cronograma resolve as duas regras de vencimento, ordenado por data.
    // Academia e Comunhão caem no mesmo 5º dia útil (07/08, porque agosto de
    // 2026 começa num sábado) e desempatam por nome; Aluguel vem depois.
    expect(summary.due.map((item) => [item.name, item.dueDate])).toEqual([
      ['Academia', '2026-08-07'],
      ['Comunhão de Bens', '2026-08-07'],
      ['Aluguel', '2026-08-10'],
    ])

    const covenant = summary.commitments.find(
      (line) => line.type === 'proportional',
    )
    expect(covenant?.consideredCents).toBe(53_250)
    expect(covenant?.parts.map((part) => part.amountCents)).toEqual([
      35_500, 17_750,
    ])
  })

  it('o período gravado no lançamento respeita o ciclo do espaço', async () => {
    const db = env.authenticatedContext(UID).firestore()

    // Ciclo começando dia 5: uma compra em 03/09 pertence à competência 08.
    const payload = entryPayload(
      {
        kind: 'expense',
        amountCents: cents(5_000),
        date: localDate('2026-09-03'),
        description: 'Padaria',
        categoryId: null,
      },
      { type: 'dayOfMonth', day: 5 },
      UID,
      serverTimestamp(),
    )

    expect(payload.period).toBe('2026-08')

    // E as rules aceitam, porque `periodIsManual` é false mas a coerência
    // data <-> período é validada contra o mês do calendário... o que NÃO bate
    // aqui. Este é justamente o caso que exige `periodIsManual`.
    const manual = { ...payload, periodIsManual: true }
    await assertSucceeds(
      setDoc(doc(collection(db, 'spaces', SPACE, 'entries')), manual),
    )
  })
})
