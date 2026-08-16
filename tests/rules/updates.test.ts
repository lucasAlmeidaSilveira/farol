import { readFileSync } from 'node:fs'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

/**
 * As edições.
 *
 * Este arquivo existe por causa de um bug que chegou até o usuário: o helper
 * `stampedNow()` — que exige `createdAt == request.time` — estava dentro de
 * validadores COMPARTILHADOS entre create e update. Numa edição, `createdAt` é
 * o carimbo original e nunca é igual a `request.time`, então TODA atualização
 * era negada com permission-denied.
 *
 * Nenhum teste pegou porque todos exercitavam só criação. A lição, de novo: um
 * caminho que o app executa precisa de um teste que o EXECUTE.
 */

let env: RulesTestEnvironment

const UID = 'uid_owner'
const SPACE = 'space_edit'

const CONFIG = {
  cycleStart: { type: 'dayOfMonth', day: 1 },
  variableIncomePolicy: 'confirmedOnly',
  timeZone: 'America/Sao_Paulo',
  currency: 'BRL',
}

const MONTHLY = { from: '2026-01', until: null, frequency: { type: 'monthly' } }

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
    const past = new Date('2026-08-01T00:00:00Z')

    await setDoc(doc(db, 'spaces', SPACE), {
      name: 'Casa',
      config: CONFIG,
      createdBy: UID,
      createdAt: past,
      updatedAt: past,
    })

    await setDoc(doc(db, 'spaces', SPACE, 'members', UID), {
      uid: UID,
      spaceId: SPACE,
      role: 'owner',
      status: 'active',
      name: 'Lucas',
      createdAt: past,
    })

    await setDoc(doc(db, 'spaces', SPACE, 'commitments', 'netflix'), {
      type: 'fixedAmount',
      name: 'Netflix',
      description: null,
      order: 100,
      preset: 'custom',
      recurrence: MONTHLY,
      amountCents: 4490,
      dueDay: null,
      memberId: null,
      archivedAt: null,
      createdAt: past,
      updatedAt: past,
    })

    await setDoc(doc(db, 'spaces', SPACE, 'incomeSources', 'salary'), {
      name: 'Salário',
      kind: 'fixed',
      forecastCents: 325000,
      confidence: 'estimated',
      recurrence: MONTHLY,
      expectedDay: 5,
      memberId: null,
      archivedAt: null,
      createdAt: past,
      updatedAt: past,
    })

    await setDoc(doc(db, 'spaces', SPACE, 'entries', 'e1'), {
      kind: 'expense',
      period: '2026-08',
      periodIsManual: false,
      date: '2026-08-14',
      amountCents: 18240,
      description: 'Mercado',
      memberId: UID,
      createdBy: UID,
      createdAt: past,
      updatedAt: past,
    })
  })
})

const asOwner = () => env.authenticatedContext(UID).firestore()

describe('editar um gasto fixo', () => {
  it('muda o valor mantendo o createdAt original', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'commitments', 'netflix'), {
        amountCents: 5990,
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('muda o nome', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'commitments', 'netflix'), {
        name: 'Netflix Premium',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('NÃO aceita reescrever o createdAt', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'commitments', 'netflix'), {
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('NÃO aceita valor negativo na edição', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'commitments', 'netflix'), {
        amountCents: -100,
      }),
    )
  })

  it('NÃO aceita campo desconhecido na edição', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'commitments', 'netflix'), {
        admin: true,
      }),
    )
  })
})

describe('editar a renda', () => {
  it('muda a previsão e a confiança', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'incomeSources', 'salary'), {
        forecastCents: 400000,
        confidence: 'exact',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('encerra a vigência da regra antiga — o "deste mês em diante"', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'incomeSources', 'salary'), {
        recurrence: { ...MONTHLY, until: '2026-07' },
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('NÃO aceita previsão negativa', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'incomeSources', 'salary'), {
        forecastCents: -1,
      }),
    )
  })
})

describe('editar um lançamento', () => {
  it('muda valor e descrição', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'entries', 'e1'), {
        amountCents: 20000,
        description: 'Mercado do mês',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('NÃO aceita trocar o autor', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'entries', 'e1'), {
        createdBy: 'outro_uid',
      }),
    )
  })

  it('NÃO aceita zerar o valor', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'entries', 'e1'), {
        amountCents: 0,
      }),
    )
  })
})

describe('ajuste de mês — o "só neste mês"', () => {
  const override = {
    period: '2026-08',
    status: 'open' as const,
    incomeSourceOverrides: {},
    commitmentOverrides: {
      netflix: {
        active: null,
        amountCents: 5990,
        rateBpByPart: null,
        contributionCents: null,
      },
    },
  }

  it('cria o documento do período na primeira edição', async () => {
    await assertSucceeds(
      setDoc(
        doc(asOwner(), 'spaces', SPACE, 'periods', '2026-08'),
        { ...override, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true },
      ),
    )
  })

  it('aceita um segundo ajuste no mesmo mês', async () => {
    const db = asOwner()
    const ref = doc(db, 'spaces', SPACE, 'periods', '2026-08')

    await assertSucceeds(
      setDoc(
        ref,
        { ...override, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true },
      ),
    )

    await assertSucceeds(
      setDoc(
        ref,
        {
          period: '2026-08',
          status: 'open',
          incomeSourceOverrides: { salary: { active: null, forecastCents: 600000 } },
          commitmentOverrides: {},
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    )
  })

  it('NÃO aceita id de período fora do formato AAAA-MM', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'spaces', SPACE, 'periods', 'agosto'), {
        period: 'agosto',
        status: 'open',
        incomeSourceOverrides: {},
        commitmentOverrides: {},
        createdAt: serverTimestamp(),
      }),
    )
  })
})

describe('apagar', () => {
  it('membro apaga compromisso, fonte e lançamento', async () => {
    const db = asOwner()
    const { deleteDoc } = await import('firebase/firestore')

    await assertSucceeds(
      deleteDoc(doc(db, 'spaces', SPACE, 'commitments', 'netflix')),
    )
    await assertSucceeds(
      deleteDoc(doc(db, 'spaces', SPACE, 'incomeSources', 'salary')),
    )
    await assertSucceeds(deleteDoc(doc(db, 'spaces', SPACE, 'entries', 'e1')))
  })
})
