import type { CategoryId } from './types'

/**
 * As categorias de gasto que todo espaço começa tendo.
 *
 * Os `id` são slugs FIXOS, e não gerados: é o que permite o lançamento rápido
 * apontar para uma categoria sem antes ler a coleção — a escrita cria o
 * documento com o id que já conhece, e o mesmo gasto lançado offline em dois
 * aparelhos aponta para o mesmo lugar em vez de duplicar a categoria.
 *
 * As cores saem da paleta já verificada em contraste, mas são DADO, não token:
 * uma vez gravadas no documento, pertencem ao espaço do usuário e não mudam
 * quando `pnpm palette:write` roda. Editá-las aqui só afeta espaços novos — é
 * por isso que duplicar o valor hexadecimal aqui não conflita com a regra de
 * fonte única dos tokens de CSS.
 */

export type DefaultCategory = {
  readonly id: CategoryId
  readonly name: string
  /** Hexadecimal de 6 dígitos — as Security Rules recusam qualquer outro formato. */
  readonly color: string
  /**
   * Gasto que a pessoa não escolhe deixar de ter.
   *
   * Ninguém consome isso ainda; existe porque a distinção precisa nascer com o
   * dado. Descobrir depois quais gastos eram essenciais exigiria perguntar de
   * novo, mês a mês, sobre lançamentos que a pessoa já esqueceu.
   */
  readonly essential: boolean
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { id: id('mercado'), name: 'Mercado', color: '#3A5F25', essential: true },
  {
    id: id('transporte'),
    name: 'Transporte',
    color: '#16536F',
    essential: true,
  },
  { id: id('comida'), name: 'Comida', color: '#8F3218', essential: false },
  { id: id('casa'), name: 'Casa', color: '#7A5605', essential: true },
  { id: id('saude'), name: 'Saúde', color: '#075940', essential: true },
  { id: id('lazer'), name: 'Lazer', color: '#664804', essential: false },
  { id: id('outros'), name: 'Outros', color: '#48594F', essential: false },
]

function id(value: string): CategoryId {
  return value as CategoryId
}
