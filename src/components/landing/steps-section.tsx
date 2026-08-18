import { SECTIONS, STEPS } from '@/content/landing'

import { DrawLine, Reveal } from './motion'
import { Section, SectionHeading } from './section'

/**
 * Como funciona, com o custo de cada passo declarado.
 *
 * A objeção real nunca é "será que funciona" — é "quanto trabalho isso vai me
 * dar". Passo que não anuncia o próprio custo é passo que a pessoa assume ser
 * caro, e três passos silenciosos parecem um fim de semana perdido.
 *
 * Por isso cada um carrega uma etiqueta de esforço, e a terceira diz
 * "opcional" em voz alta: é literalmente a promessa do produto — ele é útil no
 * primeiro minuto, com zero lançamentos.
 */
export function StepsSection() {
  return (
    <Section id="como-funciona">
      <SectionHeading {...SECTIONS.steps} />

      <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex">
            <Reveal delay={index * 0.1} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="bg-primary text-primary-foreground relative flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                >
                  {index + 1}
                  {/* O halo respirando atrás do número: o farol aceso, no
                      tamanho de um marcador. Opacidade baixíssima — se der para
                      notar que pulsa, está forte demais. */}
                  <span className="bg-primary/25 animate-glow absolute inset-0 -z-10 rounded-full blur-md" />
                </span>

                <span className="text-muted-foreground bg-muted rounded-full px-2.5 py-1 text-xs font-medium">
                  {step.effort}
                </span>

                {/*
                  A linha que se desenha até o passo seguinte. É informação, não
                  enfeite: ela diz que os três blocos são uma sequência, e não
                  três coisas soltas lado a lado. Some no celular, onde a
                  sequência já é a própria ordem vertical.
                */}
                <DrawLine
                  delay={index * 0.1 + 0.2}
                  className="from-border hidden h-px flex-1 bg-gradient-to-r to-transparent md:block"
                />
              </div>

              <h3 className="text-lg font-semibold text-balance">
                {step.title}
              </h3>

              <p className="text-muted-foreground leading-relaxed">
                {step.body}
              </p>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  )
}
