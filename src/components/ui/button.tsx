import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Botão do shadcn, com três adaptações que o Farol precisa.
 *
 * 1. VARIANTE `accent` — a ação dourada. O ouro é a luz do farol e só aparece
 *    onde a informação guia. Ele carrega uma borda no tema claro porque ouro
 *    puro sobre fundo claro não alcança o mínimo de 3:1 para componentes;
 *    no escuro a borda some, porque lá ele já passa sozinho.
 *
 * 2. ALVOS DE TOQUE MAIORES. Os tamanhos padrão do shadcn começam em 36px de
 *    altura, pensados para desktop. Este app também é usado no celular, com uma
 *    mão, dentro do mercado — abaixo de 44px o erro de toque dispara.
 *
 * 3. TAMANHO `block` — largura total, para as ações principais das telas de
 *    celular e dos sheets.
 */
const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    'active:scale-[0.98]',
  ),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        accent:
          'border-accent-border bg-accent text-accent-foreground border hover:bg-accent/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline:
          'border-input bg-background hover:bg-muted hover:text-foreground border shadow-xs',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-muted hover:text-foreground',
        quiet: 'text-muted-foreground hover:text-foreground bg-transparent',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-11 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-13 rounded-lg px-6 text-base has-[>svg]:px-4',
        block: 'h-13 w-full rounded-lg px-6 text-base',
        icon: 'size-11',
        'icon-sm': 'size-11',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
