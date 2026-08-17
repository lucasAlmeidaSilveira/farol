import { describe, expect, it } from 'vitest'

import { DEFAULT_CATEGORIES } from './categories'

/**
 * Estes testes não verificam gosto, verificam contrato.
 *
 * O documento da categoria é gravado direto no Firestore, e as Security Rules
 * recusam cor fora do formato `#rrggbb` e nome acima de 80 caracteres. Sem esta
 * checagem, um valor inválido aqui só apareceria como escrita recusada em
 * produção — e, como a escrita é offline-first e não aguarda o servidor, o
 * usuário veria a categoria aparecer na tela e sumir depois.
 */
describe('DEFAULT_CATEGORIES', () => {
  it('tem id único por categoria', () => {
    const ids = DEFAULT_CATEGORIES.map((category) => category.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('usa id em slug, sem acento nem espaço', () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.id).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it('respeita o formato de cor que as rules exigem', () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('tem nome preenchido e dentro do limite das rules', () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.name.trim()).not.toBe('')
      expect(category.name.length).toBeLessThanOrEqual(80)
    }
  })
})
