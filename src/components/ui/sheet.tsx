'use client'

import { XIcon } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import * as React from 'react'

import { LAYER, LAYER_EXIT } from '@/components/motion/transitions'
import { usePresenceOpen } from '@/components/motion/use-presence-open'
import { cn } from '@/lib/utils'

/**
 * O sheet do Farol — a superfície onde quase tudo acontece no celular.
 *
 * A animação é do Motion, e não do CSS do Radix, por um motivo concreto: o
 * Radix desmonta o conteúdo no instante em que fecha, então o sheet SUMIA. Com
 * `forceMount` + `AnimatePresence`, ele desliza de volta para baixo — e "de
 * onde ele veio e para onde ele foi" é a única informação que uma camada
 * precisa dar.
 *
 * A saída é mais curta que a entrada de propósito. Quem fechou já decidiu;
 * esperar a animação de despedida é o jeito mais barato de irritar.
 */

const SheetOpenContext = React.createContext(false)

function Sheet({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  /*
    O estado é espelhado aqui porque o `AnimatePresence` precisa saber se a
    camada está aberta para animar a SAÍDA, e o Radix só conta isso a quem
    controla. Quem passa `open` continua no controle; quem não passa ganha o
    comportamento padrão, idêntico ao de antes.
  */
  const presence = usePresenceOpen({ open, defaultOpen, onOpenChange })

  return (
    <SheetOpenContext value={presence.isOpen}>
      <SheetPrimitive.Root
        data-slot="sheet"
        open={presence.isOpen}
        onOpenChange={presence.onOpenChange}
        {...props}
      />
    </SheetOpenContext>
  )
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

/** De onde a camada entra e para onde ela volta. */
const SIDE_MOTION = {
  top: { y: '-100%' },
  bottom: { y: '100%' },
  left: { x: '-100%' },
  right: { x: '100%' },
} as const

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left'
  showCloseButton?: boolean
}) {
  const open = React.use(SheetOpenContext)
  const offset = SIDE_MOTION[side]

  return (
    <AnimatePresence>
      {open ? (
        <SheetPrimitive.Portal forceMount data-slot="sheet-portal">
          <SheetPrimitive.Overlay forceMount asChild>
            <m.div
              data-slot="sheet-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={LAYER_EXIT}
              className="fixed inset-0 z-50 bg-black/50"
            />
          </SheetPrimitive.Overlay>

          <SheetPrimitive.Content
            forceMount
            asChild
            onCloseAutoFocus={(event) => {
              // O Radix focaria o gatilho dele, que aqui não existe. Barrar o
              // padrão evita um salto de foco no meio da animação de saída;
              // quem devolve é o `onExitComplete`, quando o nó já saiu.
              event.preventDefault()
              props.onCloseAutoFocus?.(event)
            }}
            {...props}
          >
            <m.div
              data-slot="sheet-content"
              initial={offset}
              animate={{ x: 0, y: 0 }}
              exit={offset}
              transition={LAYER}
              className={cn(
                'bg-card fixed z-50 flex flex-col gap-4 shadow-lg',
                side === 'right' &&
                  'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
                side === 'left' &&
                  'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
                side === 'top' && 'inset-x-0 top-0 h-auto border-b',
                /*
                  Adaptações do Farol para o sheet de baixo, que é o formato
                  usado no app inteiro:

                  - `max-h-[92dvh]`: `dvh`, e não `vh`, para a barra de endereço
                    do Safari não cortar o conteúdo.
                  - canto superior arredondado e largura limitada no desktop,
                    senão um sheet de 1600px vira uma faixa esquisita.
                  - `pb-[env(safe-area-inset-bottom)]`: o conteúdo não fica
                    embaixo da barra de gestos do iPhone.
                */
                side === 'bottom' &&
                  'inset-x-0 bottom-0 h-auto max-h-[92dvh] rounded-t-xl border-t pb-[env(safe-area-inset-bottom)] sm:mx-auto sm:max-w-md',
                className,
              )}
            >
              {children}

              {showCloseButton && (
                <SheetPrimitive.Close className="ring-offset-background focus:ring-ring absolute top-3 right-3 flex size-11 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
                  <XIcon className="size-4" />
                  <span className="sr-only">Close</span>
                </SheetPrimitive.Close>
              )}
            </m.div>
          </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  )
}

/**
 * O corpo rolável do sheet — tudo menos a ação.
 *
 * `min-h-0` não é detalhe: sem ele, um item de flex se recusa a encolher abaixo
 * do próprio conteúdo, o `overflow-y-auto` nunca chega a rolar e o sheet inteiro
 * estoura a altura máxima.
 */
function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-body"
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4',
        className,
      )}
      {...props}
    />
  )
}

/**
 * A barra de ação, fixa no rodapé do sheet.
 *
 * Com o botão dentro da área de rolagem, um formulário alto empurra "Salvar"
 * para fora da tela. No celular a barra de rolagem e o gesto denunciam que há
 * mais conteúdo; no desktop, não — a pessoa vê um formulário aparentemente
 * completo, sem nenhuma ação, e não descobre que precisa rolar.
 */
function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        'border-border bg-card/95 mt-auto flex shrink-0 flex-col gap-2 border-t px-4 pt-3 pb-4 backdrop-blur',
        className,
      )}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
