import { describe, expect, it } from 'vitest'

import { dueRuleOf, expectedRuleOf } from './types'

/**
 * O par de campos anuláveis é a forma que o Firestore e as Security Rules
 * validam bem; a união é a forma com que a engine trabalha. A conversão entre
 * as duas é pequena, mas erra em silêncio: trocar a precedência faria uma conta
 * com os dois campos preenchidos vencer no dia errado, sem nenhum erro.
 */
describe('dueRuleOf', () => {
  it('lê vencimento por dia do calendário', () => {
    expect(dueRuleOf({ dueDay: 10, dueBusinessDay: null })).toEqual({
      type: 'dayOfMonth',
      day: 10,
    })
  })

  it('lê vencimento por dia útil', () => {
    expect(dueRuleOf({ dueDay: null, dueBusinessDay: 5 })).toEqual({
      type: 'businessDay',
      n: 5,
    })
  })

  it('devolve null quando não há regra', () => {
    expect(dueRuleOf({ dueDay: null, dueBusinessDay: null })).toBeNull()
  })

  it('com os dois preenchidos, o dia do calendário vence', () => {
    // Documento assim não passa nas rules nem no schema. A leitura não pode
    // travar por causa dele, mas a escolha precisa ser previsível.
    expect(dueRuleOf({ dueDay: 10, dueBusinessDay: 5 })).toEqual({
      type: 'dayOfMonth',
      day: 10,
    })
  })
})

describe('expectedRuleOf', () => {
  it('lê o dia do calendário em que a renda cai', () => {
    expect(
      expectedRuleOf({ expectedDay: 5, expectedBusinessDay: null }),
    ).toEqual({ type: 'dayOfMonth', day: 5 })
  })

  it('lê o dia útil — a convenção da folha de pagamento', () => {
    expect(
      expectedRuleOf({ expectedDay: null, expectedBusinessDay: 5 }),
    ).toEqual({ type: 'businessDay', n: 5 })
  })

  it('devolve null quando a fonte não declara dia', () => {
    expect(
      expectedRuleOf({ expectedDay: null, expectedBusinessDay: null }),
    ).toBeNull()
  })
})
