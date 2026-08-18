'use client'

import { Check } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SECTIONS, TOUR } from '@/content/landing'

import { Reveal } from './motion'
import { Section, SectionHeading } from './section'

/**
 * O que vem depois de entrar.
 *
 * Existe para a última incerteza, a que sobra quando a promessa já convenceu:
 * "tudo bem, mas o que exatamente eu vou receber?". Antecipar isso remove a
 * sensação de porta fechada — e porta fechada é onde a maioria desiste.
 *
 * Em abas, e não numa lista corrida, porque a escolha aqui é do leitor: cada
 * pessoa quer conferir uma tela diferente, e ninguém quer ler as quatro. As
 * abas do Radix já resolvem teclado e leitor de tela.
 *
 * As rotas vêm da navegação real do app, e um teste garante que toda tela da
 * barra lateral apareça aqui. Tela nova sem lugar na landing reprova.
 */
export function TourSection() {
  const first = TOUR[0]
  if (!first) return null

  return (
    <Section tone="muted">
      <SectionHeading {...SECTIONS.tour} />

      {/* A troca de aba já tem movimento próprio, no `globals.css`: sem ele, o
          conteúdo trocaria sem nenhum sinal de que o clique pegou. */}

      <Reveal>
        <Tabs defaultValue={first.href} className="mt-12 gap-8">
          <TabsList className="mx-auto">
            {TOUR.map((screen) => (
              <TabsTrigger key={screen.href} value={screen.href}>
                {screen.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {TOUR.map((screen) => (
            <TabsContent key={screen.href} value={screen.href}>
              <div className="bg-card mx-auto flex max-w-3xl flex-col gap-6 rounded-xl border p-6 shadow-sm sm:p-8">
                <h3 className="text-xl font-semibold text-balance">
                  {screen.headline}
                </h3>

                <ul className="flex flex-col gap-3">
                  {screen.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <Check
                        aria-hidden="true"
                        className="text-positive mt-0.5 size-4 shrink-0"
                      />
                      <span className="text-muted-foreground leading-relaxed">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Reveal>
    </Section>
  )
}
