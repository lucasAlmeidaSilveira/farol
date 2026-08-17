import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * O chip de escolha — categoria, atalho de data, opção de um passo.
 *
 * Existe porque o mesmo controle estava copiado em cinco arquivos, e as cópias
 * já tinham divergido: uma marcava seleção com preenchimento dourado, outra só
 * com a cor da borda, e o anel de foco vinha em duas gramáticas diferentes. O
 * usuário não vê "componentes"; vê o app respondendo de um jeito aqui e de
 * outro ali, na mesma tela.
 *
 * SELEÇÃO POR DUAS PISTAS: preenchimento e borda mudam juntos. Sozinha, a cor
 * não sobrevive ao daltonismo nem ao teste em escala de cinza — e este app é
 * lido no celular, sob sol.
 *
 * SEM OURO. O ouro é a luz do farol, reservado ao compromisso proporcional e à
 * ação primária — que, num sheet de lançamento, é o botão Salvar. Chip dourado
 * competia com ele, e ouro em tudo deixa de significar alguma coisa.
 *
 * Foco, desabilitado e resposta ao toque seguem `button.tsx`, para o app não
 * ter duas gramáticas de estado.
 */
const chipVariants = cva(
  cn(
    'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-all',
    'outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ),
  {
    variants: {
      selected: {
        true: 'border-foreground bg-secondary text-secondary-foreground font-medium',
        false:
          'border-input text-muted-foreground hover:bg-muted hover:text-foreground',
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
)

/*
  `selected` é declarado aqui, e não derivado de `VariantProps`: o cva admite
  `null` no tipo da variante, e `aria-pressed={null}` não é válido.
*/
export type ChipProps = React.ComponentProps<'button'> & {
  selected?: boolean
}

export function Chip({ className, selected = false, ...props }: ChipProps) {
  return (
    <button
      type="button"
      data-slot="chip"
      /*
        `aria-pressed` vem antes do spread de propósito: quem usa o chip como
        gatilho de popover — onde quem descreve o estado é `aria-expanded` —
        sobrescreve passando `aria-pressed={undefined}`.
      */
      aria-pressed={selected}
      className={cn(chipVariants({ selected }), className)}
      {...props}
    />
  )
}

export { chipVariants }
