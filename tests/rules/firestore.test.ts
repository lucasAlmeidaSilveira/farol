import { readFileSync } from 'node:fs'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

/**
 * As Security Rules são o gate REAL de segurança do Farol.
 *
 * A proteção de rota no cliente é UX: quem remover o guard no devtools vê um
 * shell vazio, porque é o Firestore que recusa os dados. Por isso estes testes
 * são pré-requisito de todo deploy de rules em produção.
 *
 * Rodam contra o emulador: `pnpm test:rules`.
 */

let env: RulesTestEnvironment

const OWNER = 'uid_owner'
const PARTNER = 'uid_partner'
const STRANGER = 'uid_stranger'
const SPACE = 'space_a'
const OTHER_SPACE = 'space_b'

const CONFIG = {
  cycleStart: { type: 'dayOfMonth', day: 1 },
  variableIncomePolicy: 'confirmedOnly',
  timeZone: 'America/Sao_Paulo',
  currency: 'BRL',
}

const MONTHLY = {
  from: '2026-01',
  until: null,
  frequency: { type: 'monthly' },
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

  // Semeia ignorando as regras: o cenário base já montado.
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()

    await setDoc(doc(db, 'spaces', SPACE), {
      name: 'Minha casa',
      config: CONFIG,
      createdBy: OWNER,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await setDoc(doc(db, 'spaces', SPACE, 'members', OWNER), {
      uid: OWNER,
      spaceId: SPACE,
      role: 'owner',
      status: 'active',
      name: 'Lucas',
      createdAt: new Date(),
    })

    await setDoc(doc(db, 'spaces', SPACE, 'members', PARTNER), {
      uid: PARTNER,
      spaceId: SPACE,
      role: 'member',
      status: 'active',
      name: 'Parceiro',
      createdAt: new Date(),
    })

    await setDoc(doc(db, 'spaces', SPACE, 'entries', 'e1'), {
      kind: 'expense',
      period: '2026-08',
      periodIsManual: false,
      date: '2026-08-14',
      amountCents: 18240,
      description: 'Mercado',
      createdBy: OWNER,
      createdAt: new Date(),
    })

    await setDoc(doc(db, 'spaces', OTHER_SPACE, 'entries', 'x1'), {
      kind: 'expense',
      period: '2026-08',
      periodIsManual: false,
      date: '2026-08-14',
      amountCents: 999,
      description: 'Segredo',
      createdBy: STRANGER,
      createdAt: new Date(),
    })
  })
})

/*
  Sem anotação de tipo de propósito: `@firebase/rules-unit-testing` devolve o
  `Firestore` do seu próprio `@firebase/firestore`, que é nominalmente distinto
  do exportado por `firebase/firestore` mesmo sendo o mesmo objeto em runtime.
  Anotar forçaria um cast que só esconderia a duplicidade.
*/
const asOwner = () => env.authenticatedContext(OWNER).firestore()
const asPartner = () => env.authenticatedContext(PARTNER).firestore()
const asStranger = () => env.authenticatedContext(STRANGER).firestore()
const asAnonymous = () => env.unauthenticatedContext().firestore()

type TestDb = ReturnType<typeof asOwner>

const validEntry = {
  kind: 'expense',
  period: '2026-08',
  periodIsManual: false,
  date: '2026-08-14',
  amountCents: 1250,
  description: 'Padaria',
  createdBy: PARTNER,
  createdAt: serverTimestamp(),
}

const createEntry = (db: TestDb, patch: Record<string, unknown> = {}) =>
  setDoc(doc(db, 'spaces', SPACE, 'entries', 'new'), { ...validEntry, ...patch })

// ============================================================================

describe('isolamento entre espaços', () => {
  it('membro lê os lançamentos do próprio espaço', async () => {
    await assertSucceeds(
      getDoc(doc(asPartner(), 'spaces', SPACE, 'entries', 'e1')),
    )
  })

  it('estranho NÃO lê lançamento de espaço alheio', async () => {
    await assertFails(
      getDoc(doc(asStranger(), 'spaces', SPACE, 'entries', 'e1')),
    )
  })

  it('membro de um espaço NÃO lê o outro espaço', async () => {
    await assertFails(
      getDoc(doc(asOwner(), 'spaces', OTHER_SPACE, 'entries', 'x1')),
    )
  })

  it('deslogado não lê nada', async () => {
    await assertFails(getDoc(doc(asAnonymous(), 'spaces', SPACE)))
  })

  it('estranho não escreve no espaço alheio', async () => {
    await assertFails(createEntry(asStranger(), { createdBy: STRANGER }))
  })
})

describe('escalonamento de privilégio', () => {
  it('membro NÃO se promove a dono', async () => {
    await assertFails(
      updateDoc(doc(asPartner(), 'spaces', SPACE, 'members', PARTNER), {
        role: 'owner',
      }),
    )
  })

  it('membro NÃO altera o próprio status', async () => {
    await assertFails(
      updateDoc(doc(asPartner(), 'spaces', SPACE, 'members', PARTNER), {
        status: 'suspended',
      }),
    )
  })

  it('membro PODE editar o próprio nome', async () => {
    await assertSucceeds(
      updateDoc(doc(asPartner(), 'spaces', SPACE, 'members', PARTNER), {
        name: 'Bê',
      }),
    )
  })

  it('dono PODE promover o parceiro', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'members', PARTNER), {
        role: 'owner',
      }),
    )
  })

  it('dono NÃO se auto-rebaixa, para o espaço não ficar órfão', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'members', OWNER), {
        role: 'member',
      }),
    )
  })

  it('estranho NÃO se auto-insere num espaço alheio', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'spaces', SPACE, 'members', STRANGER), {
        uid: STRANGER,
        spaceId: SPACE,
        role: 'member',
        status: 'active',
        name: 'Invasor',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('só o dono apaga o espaço', async () => {
    await assertFails(deleteDoc(doc(asPartner(), 'spaces', SPACE)))
    await assertSucceeds(deleteDoc(doc(asOwner(), 'spaces', SPACE)))
  })
})

describe('dinheiro é inteiro em centavos', () => {
  it('aceita um lançamento válido', async () => {
    await assertSucceeds(createEntry(asPartner()))
  })

  it('aceita gasto negativo — estorno é legítimo', async () => {
    await assertSucceeds(createEntry(asPartner(), { amountCents: -5000 }))
  })

  it('recusa gasto ZERO', async () => {
    await assertFails(createEntry(asPartner(), { amountCents: 0 }))
  })

  it('recusa valor em STRING', async () => {
    await assertFails(createEntry(asPartner(), { amountCents: '1250' }))
  })

  it('recusa valor em FLOAT — reais em vez de centavos', async () => {
    await assertFails(createEntry(asPartner(), { amountCents: 12.5 }))
  })

  it('recusa valor nulo', async () => {
    await assertFails(createEntry(asPartner(), { amountCents: null }))
  })

  it('recusa valor absurdo, acima do teto de sanidade', async () => {
    await assertFails(createEntry(asPartner(), { amountCents: 2_000_000_000 }))
  })

  it('recusa renda NEGATIVA — entrada errada se apaga, não se estorna', async () => {
    await assertFails(
      createEntry(asPartner(), {
        kind: 'income',
        amountCents: -1000,
        closesForecast: false,
      }),
    )
  })
})

describe('forma do documento', () => {
  it('recusa campo desconhecido', async () => {
    await assertFails(createEntry(asPartner(), { admin: true }))
  })

  it('recusa campo obrigatório ausente', async () => {
    await assertFails(
      setDoc(doc(asPartner(), 'spaces', SPACE, 'entries', 'new'), {
        kind: 'expense',
        amountCents: 1250,
        description: 'Sem período',
        createdBy: PARTNER,
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('recusa forjar createdBy de outra pessoa', async () => {
    await assertFails(createEntry(asPartner(), { createdBy: OWNER }))
  })

  it('recusa descrição gigante', async () => {
    await assertFails(createEntry(asPartner(), { description: 'x'.repeat(141) }))
  })

  it('recusa alterar createdAt depois de criado', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'spaces', SPACE, 'entries', 'e1'), {
        createdAt: serverTimestamp(),
      }),
    )
  })
})

describe('coerência entre data e período', () => {
  it('recusa período incoerente com a data', async () => {
    await assertFails(
      createEntry(asPartner(), { date: '2026-08-14', period: '2026-09' }),
    )
  })

  it('aceita a incoerência quando é escolha explícita do usuário', async () => {
    await assertSucceeds(
      createEntry(asPartner(), {
        date: '2026-08-28',
        period: '2026-09',
        periodIsManual: true,
      }),
    )
  })

  it('recusa período malformado', async () => {
    await assertFails(
      createEntry(asPartner(), { period: '2026-13', date: '2026-13-01' }),
    )
  })

  it('recusa data malformada', async () => {
    await assertFails(createEntry(asPartner(), { date: '14/08/2026' }))
  })
})

describe('bootstrap do espaço — a ordem das escritas importa', () => {
  it('cria o espaço e DEPOIS o próprio documento de dono', async () => {
    const db = asStranger()

    await assertSucceeds(
      setDoc(doc(db, 'spaces', 'brand_new'), {
        name: 'Meu espaço',
        config: CONFIG,
        createdBy: STRANGER,
        createdAt: serverTimestamp(),
      }),
    )

    await assertSucceeds(
      setDoc(doc(db, 'spaces', 'brand_new', 'members', STRANGER), {
        uid: STRANGER,
        spaceId: 'brand_new',
        role: 'owner',
        status: 'active',
        name: 'Novo',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('NÃO cria o documento de dono antes de o espaço existir', async () => {
    // É este comportamento que impede o uso de writeBatch: as regras não
    // enxergam escritas pendentes do mesmo lote, então o get() do espaço
    // falharia e o batch inteiro seria recusado.
    await assertFails(
      setDoc(doc(asStranger(), 'spaces', 'ghost', 'members', STRANGER), {
        uid: STRANGER,
        spaceId: 'ghost',
        role: 'owner',
        status: 'active',
        name: 'Novo',
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('recusa espaço com moeda diferente de BRL', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'spaces', 'usd_space'), {
        name: 'Dólar',
        config: { ...CONFIG, currency: 'USD' },
        createdBy: STRANGER,
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('recusa dia de ciclo fora de 1..31', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'spaces', 'bad_cycle'), {
        name: 'Ciclo inválido',
        config: { ...CONFIG, cycleStart: { type: 'dayOfMonth', day: 40 } },
        createdBy: STRANGER,
        createdAt: serverTimestamp(),
      }),
    )
  })
})

describe('compromissos e fontes de renda', () => {
  it('aceita um compromisso proporcional válido', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner(), 'spaces', SPACE, 'commitments', 'covenant'), {
        type: 'proportional',
        name: 'Comunhão de Bens',
        order: 10,
        preset: 'covenant',
        recurrence: MONTHLY,
        base: {
          includeFixed: true,
          includeVariable: true,
          excludedSourceIds: [],
          netOfPriorCommitments: false,
        },
        parts: [
          { id: 'p1', label: 'Parcela 10%', rateBp: 1000 },
          { id: 'p2', label: 'Parcela 5%', rateBp: 500 },
        ],
        floorCents: null,
        ceilingCents: null,
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('recusa proporcional com base vazia', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'spaces', SPACE, 'commitments', 'bad'), {
        type: 'proportional',
        name: 'Sem base',
        order: 10,
        preset: 'custom',
        recurrence: MONTHLY,
        base: {
          includeFixed: false,
          includeVariable: false,
          excludedSourceIds: [],
          netOfPriorCommitments: false,
        },
        parts: [{ id: 'p1', label: 'X', rateBp: 1000 }],
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('recusa fonte de renda com previsão negativa', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'spaces', SPACE, 'incomeSources', 'bad'), {
        name: 'Salário',
        kind: 'fixed',
        forecastCents: -1,
        confidence: 'exact',
        recurrence: MONTHLY,
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('aceita fonte de renda válida', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner(), 'spaces', SPACE, 'incomeSources', 'salary'), {
        name: 'Salário',
        kind: 'fixed',
        forecastCents: 325000,
        confidence: 'estimated',
        recurrence: MONTHLY,
        expectedDay: 5,
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('aceita renda que cai no N-ésimo dia útil', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner(), 'spaces', SPACE, 'incomeSources', 'folha'), {
        name: 'Salário',
        kind: 'fixed',
        forecastCents: 325000,
        confidence: 'exact',
        recurrence: MONTHLY,
        expectedBusinessDay: 5,
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('NÃO aceita dia útil acima de 23', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'spaces', SPACE, 'incomeSources', 'invalida'), {
        name: 'Salário',
        kind: 'fixed',
        forecastCents: 325000,
        confidence: 'exact',
        recurrence: MONTHLY,
        expectedBusinessDay: 24,
        createdAt: serverTimestamp(),
      }),
    )
  })

  it('NÃO aceita dia do mês e dia útil ao mesmo tempo', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'spaces', SPACE, 'incomeSources', 'ambigua'), {
        name: 'Salário',
        kind: 'fixed',
        forecastCents: 325000,
        confidence: 'exact',
        recurrence: MONTHLY,
        expectedDay: 5,
        expectedBusinessDay: 5,
        createdAt: serverTimestamp(),
      }),
    )
  })
})

describe('perfil do usuário', () => {
  it('lê e escreve o próprio perfil', async () => {
    await assertSucceeds(
      setDoc(doc(asOwner(), 'users', OWNER), {
        name: 'Lucas',
        email: 'lucas@example.com',
        activeSpaceId: SPACE,
        createdAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(getDoc(doc(asOwner(), 'users', OWNER)))
  })

  it('NÃO lê o perfil de outra pessoa', async () => {
    await assertFails(getDoc(doc(asStranger(), 'users', OWNER)))
  })

  it('NÃO aponta activeSpaceId para um espaço de que não participa', async () => {
    await assertFails(
      setDoc(doc(asStranger(), 'users', STRANGER), {
        name: 'Invasor',
        activeSpaceId: SPACE,
        createdAt: serverTimestamp(),
      }),
    )
  })
})
