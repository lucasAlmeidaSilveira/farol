import { proportionalLineOf } from '@/components/home/beacon-view'
import { CommitmentCard } from '@/components/home/commitment-card'
import { DuePanel } from '@/components/home/due-panel'
import { IncomeCard } from '@/components/home/income-card'
import { PaceCard } from '@/components/home/pace-card'
import { Reveal } from '@/components/motion/reveal'
import { demoSources, demoSummary } from '@/content/demo-month'
import {
  type Feature,
  type FeatureDemo,
  FEATURES,
  SECTIONS,
} from '@/content/landing'
import { todayIn } from '@/domain/period'
import type { IncomeSource } from '@/domain/types'
import type { MonthSummary } from '@/engine'
import { cn } from '@/lib/utils'

import { Section, SectionHeading } from './section'

/**
 * As funcionalidades que só convencem quando vistas funcionando.
 *
 * Cada faixa é uma promessa ao lado da prova dela: o texto à esquerda, o
 * COMPONENTE REAL do app à direita, alimentado por um mês calculado pela
 * engine de verdade. Não é print, não é maquete, não é vídeo — é o app.
 *
 * Isso resolve o problema mais comum de página de produto: a imagem envelhece,
 * o produto muda, e a página passa a mostrar algo que não existe mais. Aqui, se
 * o card mudar de forma ou a regra de cálculo mudar de resultado, a landing
 * muda junto, no mesmo commit, sem ninguém lembrar.
 *
 * As faixas alternam de lado. Não é enfeite: numa sequência de blocos iguais o
 * olho para de distinguir onde termina um e começa o outro, e a leitura vira
 * rolagem cega.
 *
 * Quem decide o que ganha faixa é `content/landing.ts` — a funcionalidade que
 * tiver `demo` sai da grade e vem para cá.
 */
export function FeatureStories() {
  const today = todayIn('America/Sao_Paulo')
  const summary = demoSummary(today)
  const sources = demoSources(today)

  const stories = FEATURES.filter(
    (feature): feature is Feature & { demo: FeatureDemo } =>
      feature.demo !== undefined,
  )

  return (
    <Section id="funcionalidades">
      <SectionHeading {...SECTIONS.stories} />

      <div className="mt-16 flex flex-col gap-16 lg:gap-24">
        {stories.map((feature, index) => (
          <article
            key={feature.id}
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
          >
            {/*
              Texto e peça entram um de cada lado, na direção em que já estão —
              o movimento confirma o arranjo em vez de contrariá-lo. No celular
              não há lado: `x` vira 0 e sobra a subida.
            */}
            <Reveal
              variant="reveal"
              x={index % 2 === 1 ? 24 : -24}
              className={cn(
                'flex min-w-0 flex-col gap-3',
                // Ímpar troca de lado no desktop; no celular o texto vem
                // sempre antes, porque é ele que dá sentido à peça.
                index % 2 === 1 && 'lg:order-2',
              )}
            >
              <h3 className="text-2xl font-semibold tracking-tight text-balance">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed text-balance">
                {feature.body}
              </p>
            </Reveal>

            <Reveal
              variant="reveal"
              x={index % 2 === 1 ? -24 : 24}
              delay={0.12}
              className="min-w-0"
            >
              <Demo kind={feature.demo} summary={summary} sources={sources} />
            </Reveal>
          </article>
        ))}
      </div>
    </Section>
  )
}

/**
 * O mapa de peça por funcionalidade.
 *
 * Tipado por `FeatureDemo`, então uma chave nova no conteúdo reprova no
 * `pnpm typecheck` até alguém decidir qual componente do app a demonstra. É a
 * mesma trava dos ícones: quem cobra a consistência é o compilador, não a
 * revisão.
 */
function Demo({
  kind,
  summary,
  sources,
}: {
  kind: FeatureDemo
  summary: MonthSummary
  sources: readonly IncomeSource[]
}) {
  const commitment = proportionalLineOf(summary)

  switch (kind) {
    case 'commitment':
      return commitment ? (
        <CommitmentCard
          name={commitment.name}
          totalCents={commitment.consideredCents}
          baseCents={commitment.baseCents}
          parts={commitment.parts}
          outstandingCents={commitment.outstandingCents}
          settledCents={commitment.settledCents}
        />
      ) : null

    /* Sem `onSettle`: aqui o painel é vitrine, não ferramenta. Um botão
       "Paguei" que não paga nada seria uma promessa quebrada na própria
       demonstração. */
    case 'due':
      return <DuePanel items={summary.due} />

    case 'pace':
      return (
        <PaceCard
          pace={summary.pace}
          availableCents={summary.totals.availableToSpendCents}
          spentCents={summary.totals.freeExpenseCents}
        />
      )

    case 'income':
      return (
        <IncomeCard
          lines={summary.income.lines}
          totalCents={summary.totals.consideredIncomeCents}
          cycle={summary.cycle}
          sources={sources}
          defaultOpen
        />
      )
  }
}
