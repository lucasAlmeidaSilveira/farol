import { describe, expect, it } from 'vitest'

import {
  CATALOG,
  CATALOG_GROUPS,
  type CatalogGroup,
  COMMON_CATALOG,
  findCatalogItem,
  groupCatalog,
  searchCatalog,
} from './catalog'

describe('integridade do catálogo', () => {
  it('não tem id repetido', () => {
    const ids = CATALOG.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo item pertence a um grupo conhecido', () => {
    for (const item of CATALOG) {
      expect(CATALOG_GROUPS[item.group]).toBeDefined()
    }
  })

  it('todo valor sugerido é inteiro positivo em centavos', () => {
    for (const item of CATALOG) {
      expect(Number.isInteger(item.suggestedCents)).toBe(true)
      expect(item.suggestedCents).toBeGreaterThan(0)
    }
  })

  it('a lista curta do onboarding existe e é curta', () => {
    // Curta de verdade: o onboarding tem meta de 2 minutos, e uma lista longa
    // vira parede. O resto do catálogo fica a uma busca de distância.
    expect(COMMON_CATALOG.length).toBeGreaterThan(5)
    expect(COMMON_CATALOG.length).toBeLessThanOrEqual(14)
  })

  it('a lista curta cobre moradia, alimentação e transporte', () => {
    const ids = COMMON_CATALOG.map((item) => item.id)
    expect(ids).toContain('aluguel')
    expect(ids).toContain('mercado')
    expect(ids).toContain('transporte-publico')
  })
})

describe('busca', () => {
  it('acha pelo nome exato', () => {
    expect(searchCatalog('Netflix').map((item) => item.id)).toContain('netflix')
  })

  it('ignora acento e caixa', () => {
    expect(searchCatalog('AGUA').map((item) => item.id)).toContain('agua')
    expect(searchCatalog('água').map((item) => item.id)).toContain('agua')
  })

  it('acha pelo nome popular, não só pelo oficial', () => {
    // Ninguém procura "Max": procura "HBO". Ninguém procura "Plano de celular":
    // procura "vivo". Os apelidos existem exatamente para isso.
    expect(searchCatalog('hbo').map((item) => item.id)).toContain('max')
    expect(searchCatalog('vivo').map((item) => item.id)).toContain('celular')
    expect(searchCatalog('gasolina').map((item) => item.id)).toContain(
      'combustivel',
    )
    expect(searchCatalog('supermercado').map((item) => item.id)).toContain(
      'mercado',
    )
  })

  it('busca vazia devolve o catálogo inteiro', () => {
    expect(searchCatalog('')).toHaveLength(CATALOG.length)
    expect(searchCatalog('   ')).toHaveLength(CATALOG.length)
  })

  it('devolve vazio para termo inexistente', () => {
    expect(searchCatalog('xyzabc')).toHaveLength(0)
  })
})

describe('agrupamento', () => {
  it('mantém a ordem declarada dos grupos', () => {
    const groups = groupCatalog(CATALOG).map(([group]) => group)
    const declared = Object.keys(CATALOG_GROUPS) as CatalogGroup[]
    expect(groups).toEqual(declared.filter((group) => groups.includes(group)))
  })

  it('não perde nem duplica item', () => {
    const total = groupCatalog(CATALOG).reduce(
      (sum, [, items]) => sum + items.length,
      0,
    )
    expect(total).toBe(CATALOG.length)
  })

  it('omite grupo sem resultado', () => {
    const groups = groupCatalog(searchCatalog('netflix'))
    expect(groups).toHaveLength(1)
    expect(groups[0]?.[0]).toBe('streaming')
  })
})

describe('findCatalogItem', () => {
  it('acha pelo id e devolve undefined quando não existe', () => {
    expect(findCatalogItem('spotify')?.name).toBe('Spotify')
    expect(findCatalogItem('inexistente')).toBeUndefined()
  })
})
