'use client'

import { MoneyValue } from '@/components/money/money-value'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card } from '@/components/ui/card'
import { type Cents, ZERO } from '@/domain/money'
import type { Cycle } from '@/domain/period'
import { expectedRuleOf, type IncomeSource } from '@/domain/types'
import { type IncomeLine, resolveWithin } from '@/engine'
import { formatDate, pluralize } from '@/lib/format'

/**
 * A renda do mês, com a conta aberta a um toque.
 *
 * O total sozinho não diz de onde o dinheiro vem — e para quem tem mais de uma
 * fonte, "R$ 3.550" é um número que não dá para conferir. A abertura fica
 * fechada por padrão porque a home tem um número que manda; a composição é
 * informação de segundo nível, para quem foi procurar.
 *
 * Cada linha diz se o valor é PREVISTO ou RECEBIDO. Sem isso, a soma pareceria
 * dinheiro que já está na conta — exatamente a promessa que o app existe para
 * não fazer.
 */

export type IncomeCardProps = {
  lines: readonly IncomeLine[]
  /** O que a engine considera: previsto enquanto não confirmado, realizado depois. */
  totalCents: Cents
  /** O ciclo do mês, para resolver "5º dia útil" numa data de verdade. */
  cycle: Cycle
  /** As fontes cruas — só elas sabem em que dia a renda cai. */
  sources?: readonly IncomeSource[]
}

export function IncomeCard({
  lines,
  totalCents,
  cycle,
  sources,
}: IncomeCardProps) {
  const describe = (line: IncomeLine) => stateOf(line, cycle, sources)

  /*
    Com uma fonte só, abrir mostraria uma linha idêntica ao total — um clique
    que não entrega nada. Nesse caso nome e situação vão direto no subtítulo.
  */
  if (lines.length <= 1) {
    const only = lines[0]

    return (
      <Card className="gap-2 px-6 py-5">
        <Header
          subtitle={
            only
              ? `${only.name} · ${describe(only)}`
              : 'Nenhuma fonte cadastrada'
          }
          totalCents={totalCents}
        />
      </Card>
    )
  }

  return (
    <Card className="gap-0 py-0">
      <Accordion type="single" collapsible>
        <AccordionItem value="lines" className="border-b-0">
          {/*
            `hover:no-underline` porque o sublinhado padrão do gatilho pegaria o
            valor monetário junto, e número sublinhado parece link quebrado.
          */}
          <AccordionTrigger className="px-6 py-5 hover:no-underline">
            <Header
              subtitle={`${lines.length} ${pluralize(lines.length, 'fonte', 'fontes')} de renda`}
              totalCents={totalCents}
            />
          </AccordionTrigger>

          <AccordionContent className="px-6 pb-5">
            <ul className="border-border flex flex-col gap-2.5 border-t pt-3">
              {lines.map((line) => (
                <li
                  key={line.sourceId ?? line.name}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{line.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {describe(line)}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-baseline gap-1">
                    {/* O "≈" comunica sem palavras que o valor é um chute
                        editável — a mesma marca usada no Plano. */}
                    {line.confidence === 'estimated' ? (
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground text-xs"
                      >
                        ≈
                      </span>
                    ) : null}
                    <MoneyValue cents={line.consideredCents} size="sm" />
                  </span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}

function Header({
  subtitle,
  totalCents,
}: {
  subtitle: string
  totalCents: Cents
}) {
  return (
    <div className="flex flex-1 items-baseline justify-between gap-3">
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span className="text-sm font-medium">Renda do mês</span>
        <span className="text-muted-foreground truncate text-sm font-normal">
          {subtitle}
        </span>
      </span>
      <MoneyValue cents={totalCents} size="lg" tone="positive" />
    </div>
  )
}

/**
 * Previsto ou recebido — a distinção que sustenta o número da home.
 *
 * Renda variável que ainda não caiu aparece com o valor que a engine considera
 * (zero, na política conservadora). Mostrar a linha mesmo assim é melhor do que
 * escondê-la: a fonte existe no plano, e sumir dela seria o app fingindo que a
 * pessoa não tem aquele trabalho.
 *
 * Quando a fonte declara o dia, o previsto vira DATA em vez de rótulo. É onde o
 * "5º dia útil" finalmente aparece na tela: dizer "5º dia útil" é abstrato, e a
 * conversão para "7 de agosto" é justamente a conta que ninguém faz de cabeça.
 * `resolveWithin` resolve dentro do ciclo, então continua certo para quem tem o
 * mês começando no dia 5.
 */
function stateOf(
  line: IncomeLine,
  cycle: Cycle,
  sources?: readonly IncomeSource[],
): string {
  if (line.receivedCents > ZERO) return 'recebido'
  if (line.kind === 'variable') return 'ainda não entrou'

  const source = sources?.find((item) => item.id === line.sourceId)
  const rule = source ? expectedRuleOf(source) : null
  if (rule === null) return 'previsto'

  return `previsto para ${formatDate(resolveWithin(cycle, rule))}`
}
