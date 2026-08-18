import {
  CalendarClock,
  Lightbulb,
  type LucideIcon,
  Palette,
  Percent,
  ShieldCheck,
  TrendingUp,
  WifiOff,
  Zap,
} from 'lucide-react'

import { type FeatureIcon, FEATURES, SECTIONS } from '@/content/landing'

import { Reveal } from './motion'
import { Section, SectionHeading } from './section'

/**
 * O mapa dos ícones, tipado como `Record<FeatureIcon, LucideIcon>` de
 * propósito: quem adicionar uma funcionalidade em `content/landing.ts` com uma
 * chave nova reprova no `pnpm typecheck` até desenhar o ícone dela aqui. É a
 * única forma barata de impedir que conteúdo e apresentação saiam de sincronia
 * — o compilador cobra, não a revisão.
 */
const ICONS: Record<FeatureIcon, LucideIcon> = {
  beacon: Lightbulb,
  proportional: Percent,
  income: TrendingUp,
  due: CalendarClock,
  impact: Zap,
  offline: WifiOff,
  theme: Palette,
  privacy: ShieldCheck,
}

/**
 * O que o app faz, item por item.
 *
 * Vem depois da promessa e do "como funciona" por ordem de interesse: lista de
 * funcionalidades não convence ninguém a começar — ela CONFIRMA quem já foi
 * convencido. Colocá-la antes é pedir que a pessoa avalie peças de um produto
 * cuja utilidade ela ainda não entendeu.
 *
 * Cada cartão é uma funcionalidade real, sem exceção nos dois sentidos: o que
 * o app faz e não está aqui é trabalho invisível; o que está aqui e o app não
 * faz é propaganda enganosa.
 */
export function FeaturesSection() {
  return (
    <Section tone="muted">
      <SectionHeading {...SECTIONS.features} />

      <ul className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.filter((feature) => feature.demo === undefined).map(
          (feature, index) => {
            const Icon = ICONS[feature.icon]

            return (
              <li key={feature.id} className="group flex">
                <Reveal delay={index * 0.06} className="flex flex-col gap-3">
                  {/* O ícone acende ao passar o mouse: o brilho do farol
                      vazando por baixo, o mesmo vocabulário do resto da
                      página. */}
                  <span className="bg-card text-primary group-hover:border-accent-border/60 group-hover:shadow-beam flex size-11 items-center justify-center rounded-lg border shadow-xs transition-[box-shadow,border-color] duration-300">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>

                  <h3 className="font-semibold text-balance">
                    {feature.title}
                  </h3>

                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.body}
                  </p>
                </Reveal>
              </li>
            )
          },
        )}
      </ul>
    </Section>
  )
}
