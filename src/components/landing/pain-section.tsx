import { PAIN } from '@/content/landing'

import { Reveal } from './motion'
import { Section, SectionHeading } from './section'

/**
 * O problema, dito sem culpar quem lê.
 *
 * A fórmula de sempre — "você está perdendo dinheiro sem perceber" — não serve
 * aqui. O público-alvo é quem JÁ se sente mal com dinheiro, e vergonha fecha a
 * aba. É a mesma decisão que trocou o vermelho por terracota na paleta: nomear
 * a dor, atribuí-la à ferramenta, nunca à pessoa.
 *
 * A seção termina na virada, e não na dor. Agitar o problema e mudar de
 * assunto deixa quem lê pior do que chegou.
 */
export function PainSection() {
  return (
    <Section tone="muted">
      <SectionHeading eyebrow={PAIN.eyebrow} title={PAIN.title} />

      <ul className="mt-12 grid gap-5 sm:grid-cols-3">
        {PAIN.items.map((item, index) => (
          <li key={item.title} className="flex">
            {/* Escalonamento curto: os três cartões são três cenas da mesma
                ideia, e uma cascata longa viraria espera. */}
            <Reveal
              delay={index * 0.08}
              className="bg-card hover:border-accent-border/60 flex flex-col gap-2 rounded-lg border p-6 shadow-xs transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.body}
              </p>
            </Reveal>
          </li>
        ))}
      </ul>

      <Reveal className="mx-auto mt-10 max-w-2xl text-center text-lg font-medium text-balance">
        {PAIN.close}
      </Reveal>
    </Section>
  )
}
