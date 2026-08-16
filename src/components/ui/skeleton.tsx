import { cn } from '@/lib/utils'

/**
 * Esqueleto de carregamento.
 *
 * Adaptado do shadcn: o original usa `bg-accent`, e no Farol `accent` é OURO —
 * a tela de carregamento inteira ficaria dourada, e o ouro aqui é reservado à
 * informação que guia. `muted` é o neutro certo para ausência de conteúdo.
 *
 * Esqueletos são do FORMATO do conteúdo, nunca retângulos genéricos: assim não
 * existe salto de layout quando o dado chega, e a tela nunca pisca um
 * `R$ 0,00` que seria lido como "você não tem nada".
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('bg-muted animate-pulse rounded-md', className)}
      {...props}
    />
  )
}

/** O esqueleto do card do número principal, com a silhueta exata dele. */
function BeaconSkeleton() {
  return (
    <div className="bg-beacon flex flex-col gap-5 rounded-2xl px-5 py-6 shadow-lg sm:px-6 sm:py-7">
      <div className="bg-beacon-track h-3 w-32 animate-pulse rounded-full" />
      <div className="bg-beacon-track h-14 w-56 animate-pulse rounded-lg sm:h-[4.25rem]" />
      <div className="bg-beacon-track h-4 w-40 animate-pulse rounded-full" />
      <div className="bg-beacon-track h-2.5 w-full animate-pulse rounded-full" />
    </div>
  )
}

export { BeaconSkeleton, Skeleton }
