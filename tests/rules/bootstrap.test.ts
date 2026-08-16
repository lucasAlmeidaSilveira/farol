import { readFileSync } from 'node:fs'

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, writeBatch } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { bootstrapSpace } from '@/data/bootstrap'

/**
 * O primeiro login, exercitado de verdade.
 *
 * Este arquivo existe por causa de um bug que passou: `doc(db, 'spaces')` tem
 * número ÍMPAR de segmentos e o SDK rejeita em runtime. Nenhum teste pegou
 * porque o de integração semeava o espaço com as rules desligadas, em vez de
 * percorrer o fluxo real.
 *
 * A lição virou regra: todo caminho que o app executa no primeiro uso precisa
 * ter um teste que o EXECUTE, não um que simule o resultado dele.
 */

let env: RulesTestEnvironment

const UID = 'uid_newcomer'

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
})

describe('primeiro login', () => {
  it('cria espaço, associação de dono e perfil apontando para ele', async () => {
    const db = env.authenticatedContext(UID).firestore()

    const spaceId = await bootstrapSpace(db as never, {
      uid: UID,
      name: 'Lucas Silveira',
      email: 'lucas@example.com',
      photoUrl: null,
    })

    expect(spaceId).toBeTruthy()

    const space = await getDoc(doc(db, 'spaces', spaceId))
    expect(space.exists()).toBe(true)
    expect(space.data()?.createdBy).toBe(UID)
    expect(space.data()?.config.currency).toBe('BRL')

    const member = await getDoc(doc(db, 'spaces', spaceId, 'members', UID))
    expect(member.exists()).toBe(true)
    expect(member.data()?.role).toBe('owner')
    expect(member.data()?.status).toBe('active')

    const profile = await getDoc(doc(db, 'users', UID))
    expect(profile.data()?.activeSpaceId).toBe(spaceId)
    expect(profile.data()?.name).toBe('Lucas Silveira')
  })

  it('é idempotente: logar de novo reaproveita o mesmo espaço', async () => {
    const db = env.authenticatedContext(UID).firestore()

    const first = await bootstrapSpace(db as never, {
      uid: UID,
      name: 'Lucas',
      email: null,
      photoUrl: null,
    })
    const second = await bootstrapSpace(db as never, {
      uid: UID,
      name: 'Lucas',
      email: null,
      photoUrl: null,
    })

    expect(second).toBe(first)
  })

  it('nome nulo vira um padrão, nunca string vazia', async () => {
    // A Apple envia o nome uma única vez; se não vier, o documento de membro
    // não pode ficar com nome vazio — a rule exige tamanho maior que zero.
    const db = env.authenticatedContext(UID).firestore()

    const spaceId = await bootstrapSpace(db as never, {
      uid: UID,
      name: null,
      email: null,
      photoUrl: null,
    })

    const member = await getDoc(doc(db, 'spaces', spaceId, 'members', UID))
    expect(member.data()?.name).toBe('Você')
  })

  it('em BATCH o mesmo fluxo FALHA — é por isso que ele é sequencial', async () => {
    // As rules não enxergam escritas pendentes do mesmo lote: a regra do
    // documento de membro faz `get(space)`, não acha nada, e o batch inteiro é
    // recusado. Este teste trava a decisão para que ninguém "otimize" depois.
    const db = env.authenticatedContext(UID).firestore()
    const batch = writeBatch(db)

    batch.set(doc(db, 'spaces', 'batched'), {
      name: 'Meu espaço',
      config: {
        cycleStart: { type: 'dayOfMonth', day: 1 },
        variableIncomePolicy: 'confirmedOnly',
        timeZone: 'America/Sao_Paulo',
        currency: 'BRL',
      },
      createdBy: UID,
      createdAt: new Date(),
    })

    batch.set(doc(db, 'spaces', 'batched', 'members', UID), {
      uid: UID,
      spaceId: 'batched',
      role: 'owner',
      status: 'active',
      name: 'Lucas',
      createdAt: new Date(),
    })

    await expect(batch.commit()).rejects.toThrow()
  })
})
