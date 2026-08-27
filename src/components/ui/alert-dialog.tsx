'use client'

import { AnimatePresence, m } from 'motion/react'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import * as React from 'react'

import { LAYER, LAYER_EXIT } from '@/components/motion/transitions'
import { usePresenceOpen } from '@/components/motion/use-presence-open'
import { cn } from '@/lib/utils'

/**
 * Diálogo de confirmação para ação destrutiva.
 *
 * Separado do `Dialog` comum porque o comportamento é outro, e a diferença é
 * de acessibilidade, não de estilo: `alertdialog` interrompe o leitor de tela,
 * o foco entra no botão seguro, e não há como fechar clicando fora nem no X —
 * a pessoa precisa escolher. É o que se quer quando a saída apaga dado.
 *
 * Escrito à mão, na forma do shadcn, como o resto de `ui/`.
 *
 * A animação é do Motion: o diálogo cresce de 96% ao abrir e encolhe ao fechar.
 * O `forceMount` existe para a saída — sem ele o Radix desmonta na hora, e uma
 * confirmação que some sem transição deixa dúvida sobre o que foi clicado.
 */

const AlertDialogOpenContext = React.createContext(false)

function AlertDialog({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  const presence = usePresenceOpen({ open, defaultOpen, onOpenChange })

  return (
    <AlertDialogOpenContext value={presence.isOpen}>
      <AlertDialogPrimitive.Root
        data-slot="alert-dialog"
        open={presence.isOpen}
        onOpenChange={presence.onOpenChange}
        {...props}
      />
    </AlertDialogOpenContext>
  )
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  const open = React.use(AlertDialogOpenContext)

  return (
    <AnimatePresence>
      {open ? (
        <AlertDialogPrimitive.Portal forceMount>
          <AlertDialogPrimitive.Overlay forceMount asChild>
            <m.div
              data-slot="alert-dialog-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={LAYER_EXIT}
              className="fixed inset-0 z-50 bg-black/50"
            />
          </AlertDialogPrimitive.Overlay>

          <AlertDialogPrimitive.Content
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
              data-slot="alert-dialog-content"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={LAYER}
              className={cn(
                'bg-card fixed top-[50%] left-[50%] z-50 flex w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-xl border p-6 shadow-lg outline-none sm:max-w-md',
                className,
              )}
            >
              {children}
            </m.div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row', className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn('text-lg leading-tight font-semibold', className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-muted-foreground text-sm text-balance', className)}
      {...props}
    />
  )
}

function AlertDialogAction({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action data-slot="alert-dialog-action" {...props} />
  )
}

function AlertDialogCancel({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" {...props} />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
}
