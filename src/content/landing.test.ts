import { describe, expect, it } from 'vitest'

import { proportionalLineOf } from '@/components/home/beacon-view'
import { NAV_ITEMS } from '@/components/shell/nav-items'
import { demoIncomeImpact, demoSummary } from '@/content/demo-month'
import { FAQ, FEATURES, TOUR } from '@/content/landing'
import { localDate } from '@/domain/period'

/**
 * O que dá para verificar da landing sem um humano lendo.
 *
 * Não é teste de texto — texto é julgamento. É teste das duas formas de
 * defasagem que passam despercebidas num diff: um exemplo que deixou de
 * mostrar o produto funcionando e uma tela do app que a página nunca menciona.
 */

/* Pontos do mês em que o exemplo precisa continuar de pé: a virada, o meio, o
   fim e um fevereiro, que é onde toda conta de calendário quebra primeiro. */
const DAYS = ['2026-03-01', '2026-03-16', '2026-03-31', '2026-02-28'] as const

describe('mês de exemplo', () => {
  /*
    A landing mostra o produto FUNCIONANDO. Um exemplo onde a pessoa está no
    vermelho apagaria o farol na primeira tela pública — tecnicamente correto,
    comercialmente suicida. Se alguém mexer nas contas do exemplo a ponto de
    estourar a renda, isto reprova antes de virar deploy.
  */
  it.each(DAYS)('sobra dinheiro no dia %s', (day) => {
    const summary = demoSummary(localDate(day))

    expect(summary.totals.remainingToSpendCents).toBeGreaterThan(0)
    expect(summary.pace.dailyPaceCents).not.toBeNull()
  })

  it('tem um compromisso proporcional, com a fórmula aberta', () => {
    const line = proportionalLineOf(demoSummary(localDate(DAYS[1])))

    expect(line).toBeDefined()
    expect(line?.parts.length).toBeGreaterThan(1)
  })

  it('tem contas a vencer para a listagem mostrar', () => {
    expect(demoSummary(localDate(DAYS[1])).due.length).toBeGreaterThan(0)
  })

  /*
    Descoberto na primeira renderização real: rodando dia 17, TODAS as contas
    do exemplo apareciam vencidas, em terracota, com "3 contas atrasadas" no
    topo — a página que vende controle mostrando alguém que perdeu o controle.
    O exemplo agora quita o que já venceu, e isto impede a regressão em
    qualquer dia do mês.
  */
  it.each(DAYS)('não mostra conta atrasada no dia %s', (day) => {
    const overdue = demoSummary(localDate(day)).due.filter(
      (item) => item.status === 'overdue',
    )

    expect(overdue).toHaveLength(0)
  })

  it('o freela sobe o compromisso e ainda aumenta a folga', () => {
    const impact = demoIncomeImpact(localDate(DAYS[1]))

    expect(impact.commitmentDeltaCents).toBeGreaterThan(0)
    expect(impact.availableDeltaCents).toBeGreaterThan(0)
    // O que entrou vira compromisso ou folga. Não existe terceiro destino, e
    // um chip que não fecha é o pior anúncio possível para um app de dinheiro.
    expect(impact.commitmentDeltaCents + impact.availableDeltaCents).toBe(
      impact.incomeCents,
    )
  })
})

describe('funcionalidades', () => {
  it('não repete id', () => {
    const ids = FEATURES.map((feature) => feature.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  /*
    A página tem dois lugares para funcionalidade: a faixa com o componente do
    app ao lado (`demo`) e a grade. Esvaziar qualquer um dos dois quebra o
    ritmo da página sem quebrar o build — daí o teste.
  */
  it('tem funcionalidade com demonstração e funcionalidade na grade', () => {
    const withDemo = FEATURES.filter((feature) => feature.demo !== undefined)
    const inGrid = FEATURES.filter((feature) => feature.demo === undefined)

    expect(withDemo.length).toBeGreaterThan(0)
    expect(inGrid.length).toBeGreaterThan(0)
  })

  it('toda entrada tem título e explicação', () => {
    for (const feature of FEATURES) {
      expect(feature.title.trim()).not.toBe('')
      expect(feature.body.trim()).not.toBe('')
    }
  })
})

describe('tour', () => {
  /*
    O guarda de defasagem: tela nova na navegação do app reprova aqui até
    ganhar um lugar na landing. É o único ponto do repositório onde adicionar
    funcionalidade tem consequência automática na página pública.
  */
  it('cobre todas as telas da navegação do app', () => {
    const covered = new Set(TOUR.map((screen) => screen.href))

    for (const item of NAV_ITEMS) {
      expect(covered).toContain(item.href)
    }
  })

  it('toda tela lista o que ela mostra', () => {
    for (const screen of TOUR) {
      expect(screen.points.length).toBeGreaterThan(0)
    }
  })
})

describe('dúvidas', () => {
  it('toda pergunta é uma pergunta e tem resposta', () => {
    expect(FAQ.length).toBeGreaterThan(0)

    for (const item of FAQ) {
      expect(item.question.endsWith('?')).toBe(true)
      expect(item.answer.trim()).not.toBe('')
    }
  })
})
