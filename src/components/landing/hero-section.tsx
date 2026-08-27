import { Check } from 'lucide-react'
import Link from 'next/link'

import { Reveal } from '@/components/motion/reveal'
import { Button } from '@/components/ui/button'
import { HERO } from '@/content/landing'

import { BeaconPreview } from './beacon-preview'
import { EnterCta } from './enter-cta'

/**
 * A dobra. Ela tem um trabalho só: fazer a pessoa se reconhecer em uma frase.
 *
 * O título é a pergunta que ela já faz sozinha, nas palavras dela — não uma
 * promessa sobre "transformar sua vida financeira". Quem não sabe quanto pode
 * gastar não procura transformação, procura um número. Ler o próprio
 * pensamento escrito na tela é o que separa "mais um app de finanças" de
 * "isto é sobre mim".
 *
 * À direita, a resposta: o card real do app, com um exemplo. Promessa à
 * esquerda, prova à direita, na mesma tela e sem rolar.
 *
 * As três garantias abaixo do botão não são enfeite — são as três objeções que
 * travam o clique ("vai dar trabalho", "vão mexer no meu banco", "vou ter que
 * criar mais uma senha"), respondidas antes de virarem motivo para fechar a
 * aba.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <BeamGlow />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10 lg:pt-24 lg:pb-28">
        {/*
          A cascata segue o conteúdo, na ordem em que se lê: rótulo, pergunta,
          resposta, ação, garantias. O passo é de 90ms — maior que os 40ms de
          dentro do app, onde leria como lentidão, e menor que os 110ms do
          painel de marca, que é apresentação pura.

          Cada bloco entra desfocado e ganha foco. É o gesto que a página
          inteira vende: o que estava embaçado fica nítido.
        */}
        <div className="flex min-w-0 flex-col gap-6">
          <Reveal variant="reveal" delay={0} onMount>
            <p className="text-eyebrow text-muted-foreground uppercase">
              {HERO.eyebrow}
            </p>
          </Reveal>

          <Reveal variant="reveal" delay={0.09} onMount>
            <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {HERO.title}
            </h1>
          </Reveal>

          <Reveal variant="reveal" delay={0.18} onMount>
            <p className="text-muted-foreground max-w-lg text-lg leading-relaxed text-balance">
              {HERO.lead}
            </p>
          </Reveal>

          <Reveal
            variant="reveal"
            delay={0.27}
            onMount
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <EnterCta
              label={HERO.primary.label}
              variant="accent"
              size="lg"
              className="sm:w-auto"
            />

            <Button asChild variant="ghost" size="lg">
              <Link href={HERO.secondary.href}>{HERO.secondary.label}</Link>
            </Button>
          </Reveal>

          <Reveal variant="reveal" delay={0.36} onMount>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {HERO.reassurances.map((item) => (
                <li
                  key={item}
                  className="text-muted-foreground flex items-center gap-1.5 text-sm"
                >
                  <Check
                    aria-hidden="true"
                    className="text-positive size-4 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* A prova entra depois da promessa. Sem deslocamento lateral: no
            celular ele empurraria o card para fora da tela. */}
        <Reveal
          variant="reveal"
          delay={0.22}
          onMount
          className="min-w-0 lg:pl-4"
        >
          <BeaconPreview />
        </Reveal>
      </div>
    </section>
  )
}

/**
 * A luz do farol varrendo o fundo da dobra.
 *
 * Mesma ideia do painel da tela de entrada, em intensidade menor: aqui o fundo
 * é claro e o halo serve só para o topo da página não ser um retângulo chapado.
 * Se der para acompanhar o movimento com os olhos, está forte demais — e quem
 * pediu menos movimento recebe a versão parada, pelo corte global do
 * `globals.css`.
 */
function BeamGlow() {
  return (
    /*
      Só a partir de `lg`, e isso é correção de bug, não gosto.

      Abaixo disso o hero é uma coluna só ocupando a largura inteira, e um halo
      de 40rem não tem para onde ir: ele fica ATRÁS DO TEXTO. Medido com
      axe-core em 390px, o rótulo e a linha de apoio caíam para 2.19:1 sobre o
      dourado — menos da metade do mínimo da norma, e visível a olho nu na
      captura. No desktop as duas colunas dão o espaço vazio onde ele deve
      viver.

      Vale a régua do `globals.css`: se o movimento rouba a atenção do texto,
      está forte demais. Aqui ele estava roubando o texto inteiro.
    */
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden lg:block"
    >
      {/* Duas camadas com durações que não se dividem (26s e 41s) nunca
          repetem o mesmo encontro — é isso que faz o fundo parecer vivo em vez
          de um laço rodando. O halo que respira vai por dentro, para as duas
          animações não brigarem pela mesma propriedade. */}
      <div className="animate-drift absolute -top-52 -right-24 size-[40rem]">
        <div
          className="animate-glow size-full rounded-full opacity-[0.13] blur-3xl"
          style={{ background: 'var(--brand-beam)' }}
        />
      </div>
      <div className="animate-drift-slow absolute -top-40 -left-32 size-[34rem]">
        <div
          className="size-full rounded-full opacity-[0.10] blur-3xl"
          style={{ background: 'var(--primary)' }}
        />
      </div>
    </div>
  )
}
