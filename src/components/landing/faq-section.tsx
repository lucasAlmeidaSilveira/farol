'use client'

import { Reveal } from '@/components/motion/reveal'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FAQ, SECTIONS } from '@/content/landing'

import { Section, SectionHeading } from './section'

/**
 * As objeções, ditas com todas as letras.
 *
 * FAQ de landing não é suporte: é o lugar onde o medo que trava o clique é
 * nomeado e respondido em uma frase. "Preciso conectar meu banco?" e "preciso
 * lançar todo gasto?" vêm primeiro porque são as duas dúvidas que fazem
 * alguém fechar a aba — e as duas respostas são "não".
 *
 * Fechado por padrão, e um de cada vez: uma parede de texto aberta transmite
 * "isto é complicado", que é exatamente o oposto do argumento da página.
 */
export function FaqSection() {
  return (
    <Section id="duvidas">
      <SectionHeading {...SECTIONS.faq} />

      <Reveal variant="reveal" className="mx-auto mt-12 w-full max-w-2xl">
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="text-base">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </Section>
  )
}
