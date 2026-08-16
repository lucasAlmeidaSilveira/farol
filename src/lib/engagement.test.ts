import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  countSession,
  hasLaunched,
  isEngaged,
  markFirstEntry,
  MIN_SESSIONS,
  sessionCount,
} from './engagement'

/**
 * A regra que estes testes protegem é de produto, não de código: o convite de
 * instalar NÃO pode aparecer no primeiro minuto. O navegador só deixa pedir uma
 * vez, então pedir cedo demais queima a única chance.
 */

class FakeStorage {
  private data = new Map<string, string>()

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
  /** Simula uma aba nova: `sessionStorage` morre, `localStorage` sobrevive. */
  clear(): void {
    this.data.clear()
  }
}

/** Storage que lança em tudo, como o Safari em navegação privada. */
const hostileStorage = {
  getItem(): string | null {
    throw new Error('bloqueado')
  },
  setItem(): void {
    throw new Error('bloqueado')
  },
}

let local: FakeStorage
let session: FakeStorage

function install(storages: { localStorage: unknown; sessionStorage: unknown }) {
  Object.defineProperty(globalThis, 'window', {
    value: storages,
    configurable: true,
    writable: true,
  })
}

beforeEach(() => {
  local = new FakeStorage()
  session = new FakeStorage()
  install({ localStorage: local, sessionStorage: session })
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window')
})

/** Fecha a aba e abre outra: só o `sessionStorage` se perde. */
const newTab = () => session.clear()

describe('contagem de sessões', () => {
  it('conta uma vez por aba, não por render', () => {
    countSession()
    countSession()
    countSession()
    expect(sessionCount()).toBe(1)
  })

  it('conta de novo quando o usuário volta em outra sessão', () => {
    countSession()
    newTab()
    countSession()
    expect(sessionCount()).toBe(2)
  })

  it('parte do zero antes de qualquer visita', () => {
    expect(sessionCount()).toBe(0)
  })
})

describe('primeiro lançamento', () => {
  it('marca uma vez e permanece marcado', () => {
    expect(hasLaunched()).toBe(false)
    markFirstEntry()
    markFirstEntry()
    expect(hasLaunched()).toBe(true)
  })
})

describe('o convite só aparece com os DOIS sinais', () => {
  it('não convida na primeira sessão, mesmo com lançamento', () => {
    countSession()
    markFirstEntry()
    expect(isEngaged()).toBe(false)
  })

  it('não convida quem voltou mas nunca lançou nada', () => {
    countSession()
    newTab()
    countSession()
    expect(sessionCount()).toBe(MIN_SESSIONS)
    expect(isEngaged()).toBe(false)
  })

  it('convida quem voltou E lançou', () => {
    countSession()
    markFirstEntry()
    newTab()
    countSession()
    expect(isEngaged()).toBe(true)
  })
})

describe('storage bloqueado', () => {
  beforeEach(() => {
    install({ localStorage: hostileStorage, sessionStorage: hostileStorage })
  })

  it('não quebra, e no silêncio decide por não convidar', () => {
    expect(() => countSession()).not.toThrow()
    expect(() => markFirstEntry()).not.toThrow()
    expect(sessionCount()).toBe(0)
    expect(hasLaunched()).toBe(false)
    expect(isEngaged()).toBe(false)
  })
})

describe('sem navegador (SSR)', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('não convida e não explode', () => {
    expect(() => countSession()).not.toThrow()
    expect(() => markFirstEntry()).not.toThrow()
    expect(isEngaged()).toBe(false)
  })
})
