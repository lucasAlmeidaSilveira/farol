import { FarolMark } from '@/components/brand/farol-mark'
import { CLOSING, HERO } from '@/content/landing'

import { EnterCta } from './enter-cta'
import { Reveal } from './motion'

/**
 * A última chamada, na superfície da marca.
 *
 * Quem chegou até aqui leu a página inteira e não clicou — está a um empurrão
 * de distância, e o empurrão certo é repetir a promessa em uma frase, com o
 * mesmo botão de sempre. Nada de oferta nova, nada de urgência inventada:
 * contagem regressiva num app de finanças pessoais destrói a única coisa que
 * ele precisa ter, que é confiança.
 *
 * O painel usa a superfície `beacon`, a mesma do card do número e do lado
 * esquerdo da tela de entrada. É a costura visual do funil: a próxima tela que
 * a pessoa vai ver já começou aqui.
 */
export function ClosingSection() {
  return (
    <section className="px-5 py-20 sm:px-6 sm:py-24 lg:px-10">
      <Reveal className="bg-beacon relative mx-auto flex w-full max-w-4xl flex-col items-center gap-6 overflow-hidden rounded-2xl px-6 py-14 text-center shadow-lg sm:px-12">
        {/*
          A varredura do farol, a mesma da tela de entrada: um facho em
          gradiente cônico girando devagar, e um halo respirando por baixo para
          o canto nunca ficar apagado entre as passadas. Opacidade baixíssima e
          `blur` alto são o que separam "ambiente" de "objeto girando na tela".
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div
            className="animate-beam absolute -top-1/2 -left-1/4 size-[42rem] opacity-[0.16] blur-3xl"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, var(--brand-beam) 26deg, transparent 62deg, transparent 360deg)',
            }}
          />
          <div className="animate-glow bg-light-dim/20 absolute -top-24 -left-16 size-72 rounded-full blur-3xl" />

          {/* A mesma varredura da dobra, fechando o ciclo: a página começa e
              termina com a luz passando. */}
          <span
            className="animate-sheen absolute inset-y-0 left-0 w-1/4"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgb(255 255 255 / 0.22), transparent)',
            }}
          />
        </div>

        <div className="relative flex flex-col items-center gap-6">
          <FarolMark size={52} tone="theme" withHorizon />

          <h2 className="text-beacon-foreground text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {CLOSING.title}
          </h2>

          <p className="text-beacon-muted max-w-xl text-lg leading-relaxed text-balance">
            {CLOSING.body}
          </p>

          <EnterCta label={CLOSING.primary.label} variant="accent" size="lg" />

          <p className="text-beacon-muted text-sm">
            {HERO.reassurances.join(' · ')}
          </p>
        </div>
      </Reveal>
    </section>
  )
}
