import { Reveal } from '@/components/motion/reveal'
import { cn } from '@/lib/utils'

/**
 * O ritmo da página pública.
 *
 * Dentro do app, o espaçamento é apertado de propósito: quem está lá tem uma
 * tarefa e quer o número. Aqui é o contrário — a pessoa está DECIDINDO, e
 * decisão precisa de ar. Seção alta e uma ideia por bloco é o que mantém a
 * leitura possível numa rolagem longa.
 *
 * As duas variações de fundo existem para marcar essa troca de assunto sem
 * régua nem título gritado: o olho percebe a faixa e entende que começou outra
 * coisa.
 */
export function Section({
  id,
  tone = 'default',
  className,
  children,
}: {
  id?: string
  tone?: 'default' | 'muted'
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      // O deslocamento compensa o cabeçalho fixo: sem ele, o link de âncora
      // esconde o título da seção atrás da barra.
      className={cn(
        'scroll-mt-20 py-20 sm:py-24 lg:py-28',
        tone === 'muted' && 'bg-muted/60 border-y',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-10">
        {children}
      </div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'center',
  className,
}: {
  eyebrow?: string
  title: string
  lead?: string
  align?: 'center' | 'start'
  className?: string
}) {
  return (
    <Reveal
      variant="reveal"
      className={cn(
        // Cada cabeçalho entra ao chegar na tela: é ele que marca a troca de
        // assunto, então o movimento acontece exatamente onde a leitura vira
        // de página.
        'flex flex-col gap-4',
        align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl',
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-eyebrow text-muted-foreground uppercase">
          {eyebrow}
        </p>
      ) : null}

      {/* `text-balance` distribui as linhas do título em vez de deixar uma
          palavra órfã na última — o defeito mais visível de manchete curta. */}
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>

      {lead ? (
        <p className="text-muted-foreground text-lg leading-relaxed text-balance">
          {lead}
        </p>
      ) : null}
    </Reveal>
  )
}
