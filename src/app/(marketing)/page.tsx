import type { Metadata } from 'next'

import { ClosingSection } from '@/components/landing/closing-section'
import { FaqSection } from '@/components/landing/faq-section'
import { FeatureStories } from '@/components/landing/feature-stories'
import { FeaturesSection } from '@/components/landing/features-section'
import { HeroSection } from '@/components/landing/hero-section'
import { PainSection } from '@/components/landing/pain-section'
import { StandaloneRedirect } from '@/components/landing/standalone-redirect'
import { StepsSection } from '@/components/landing/steps-section'
import { TourSection } from '@/components/landing/tour-section'
import { FAQ, HERO } from '@/content/landing'

/**
 * A página se refaz uma vez por dia.
 *
 * O exemplo é calculado pela engine com `today` injetado — logo, congela no
 * build. Sem isto, uma semana depois do deploy a landing mostraria "faltam 12
 * dias" num mês que já virou, e o vencimento de uma conta que já passou. Um
 * dia é a menor granularidade que importa: o exemplo é diário, não horário.
 */
export const revalidate = 86_400

export const metadata: Metadata = {
  description: `${HERO.title} ${HERO.lead}`,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: 'Farol',
    title: 'Farol — clareza sobre o seu dinheiro',
    description: HERO.title,
  },
}

/**
 * A página inicial.
 *
 * A ordem das seções é um argumento, não um layout: quem lê passa por
 * PROMESSA → problema → como funciona → o que faz → prova → por dentro →
 * objeções → última chamada. Cada seção responde a pergunta que a anterior
 * deixou aberta, e nenhuma pede uma decisão antes de ter dado uma razão.
 *
 * A prova no meio do caminho é literal: peças do app rodando, com um mês
 * calculado pela engine de verdade. É o que separa esta página de uma que
 * promete e some.
 *
 * Duas coisas que esta página deliberadamente NÃO tem, e o motivo:
 *
 * - **Nenhuma prova social.** Sem depoimento, sem contador de usuários, sem
 *   logo de imprensa. O produto não tem base instalada, e inventar uma é a
 *   primeira promessa quebrada — num app de dinheiro, ela custa a instalação
 *   inteira. A prova aqui é o próprio produto, mostrado antes do cadastro.
 * - **Nenhuma urgência.** Sem contagem regressiva, sem "vagas limitadas". A
 *   pressa é o oposto do que este produto vende, que é calma diante do
 *   próprio dinheiro.
 *
 * Todo o texto vem de `src/content/landing.ts` — é lá que a página se
 * atualiza quando o app ganha funcionalidade.
 */
export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <PainSection />
      <StepsSection />
      <FeatureStories />
      <FeaturesSection />
      <TourSection />
      <FaqSection />
      <ClosingSection />

      <FaqJsonLd />
      <StandaloneRedirect />
    </>
  )
}

/**
 * As perguntas frequentes em dados estruturados.
 *
 * Não é enfeite de SEO: quem procura "quanto posso gastar por mês" pesquisa em
 * forma de pergunta, e é este bloco que permite ao buscador mostrar a resposta
 * já na listagem. A fonte é a MESMA lista renderizada na tela — marcação que
 * descreve conteúdo ausente da página é penalizada, e com razão.
 */
function FaqJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }

  return (
    <script
      type="application/ld+json"
      // Conteúdo estático, escrito por nós, sem entrada de usuário em lugar
      // nenhum — o `JSON.stringify` já escapa o que precisa ser escapado.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
