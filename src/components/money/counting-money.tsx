'use client'

import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

import {
  MoneyValue,
  type MoneyValueProps,
} from '@/components/money/money-value'
import { DURATION, EASE } from '@/components/motion/transitions'
import { type Cents, cents } from '@/domain/money'
import { spokenBRL } from '@/lib/format'

/**
 * Um valor que CORRE de um número ao outro.
 *
 * É o único lugar do app em que a animação não decora nem explica: ela É a
 * informação. Ver R$ 3.100 virar R$ 3.550 na frente responde "quanto isso
 * mudou?" sem que ninguém precise subtrair de cabeça — e é justamente essa
 * conta que o público-alvo não consegue fazer.
 *
 * Duas decisões de acessibilidade que não são negociáveis:
 *
 * 1. **O leitor de tela ouve o valor FINAL, uma vez.** Sem isto, cada quadro da
 *    contagem viraria um anúncio, e a pessoa ouviria sessenta números até
 *    chegar no que importa.
 * 2. **Quem pediu menos movimento recebe o número pronto.** Nada de contagem
 *    instantânea disfarçada: o valor final aparece direto.
 *
 * Continua passando por `<MoneyValue>`: ninguém escreve `R$` na mão, nem aqui.
 */
export function CountingMoney({
  from,
  to,
  ...props
}: Omit<MoneyValueProps, 'cents' | 'srLabel'> & {
  from: Cents
  to: Cents
}) {
  const reduced = useReducedMotion()
  const [counted, setCounted] = useState<Cents>(from)

  // Derivado no render, e não por `setState` dentro do efeito: quem pediu menos
  // movimento vê o valor final desde o primeiro quadro, sem passar por estado
  // intermediário nenhum.
  const value = reduced ? to : counted

  useEffect(() => {
    if (reduced) return

    const controls = animate(from, to, {
      duration: DURATION.count,
      ease: EASE,
      // Arredonda a cada quadro: centavo fracionário na tela, ainda que por
      // 16ms, é exatamente o tipo de coisa que faz duvidar do número inteiro.
      onUpdate: (current) => setCounted(cents(Math.round(current))),
    })

    return () => controls.stop()
  }, [from, to, reduced])

  return <MoneyValue cents={value} srLabel={spokenBRL(to)} {...props} />
}
