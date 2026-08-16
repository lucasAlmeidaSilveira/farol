import Link from 'next/link'

import { FarolMark } from '@/components/brand/farol-mark'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * O estado vazio que importa: a pessoa ainda não montou o plano.
 *
 * Aqui NÃO existe `R$ 0,00`. Para quem já se sente mal com dinheiro, um zero
 * grande na tela é um julgamento disfarçado de dado. O vazio tem nome próprio,
 * uma explicação curta do que falta e um único próximo passo.
 *
 * O farol aparece APAGADO — é o único lugar, junto com os estados de erro, em
 * que essa versão do símbolo pode ser usada.
 */
export function EmptyBeacon() {
  return (
    <section className="bg-beacon flex flex-col items-center gap-5 rounded-2xl px-6 py-10 text-center shadow-lg">
      <FarolMark size={56} tone="theme" lit={false} withHorizon />

      <div className="flex flex-col gap-2">
        <h2 className="text-beacon-foreground text-xl font-semibold">
          Seu farol ainda não está aceso
        </h2>
        <p className="text-beacon-muted text-sm text-balance">
          Leva um minuto: me diz quanto entra e o que sai fixo todo mês, e eu te
          mostro quanto sobra.
        </p>
      </div>

      <Link
        href="/onboarding"
        className={cn(buttonVariants({ variant: 'accent', size: 'lg' }))}
      >
        Acender meu farol
      </Link>
    </section>
  )
}
