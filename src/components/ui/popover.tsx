'use client'

import { AnimatePresence, m } from 'motion/react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import * as React from 'react'

import { DURATION, EASE } from '@/components/motion/transitions'
import { usePresenceOpen } from '@/components/motion/use-presence-open'
import { cn } from '@/lib/utils'

/**
 * Popover com entrada e saída animadas pelo Motion.
 *
 * Cresce a partir da origem que o Radix calcula — a variável
 * `--radix-popover-content-transform-origin` aponta para o gatilho —, então o
 * painel parece SAIR do botão que a pessoa tocou, e não aparecer solto na
 * tela. É mais curto que um sheet: popover é resposta imediata, não camada.
 */

const PopoverOpenContext = React.createContext(false)

function Popover({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  const presence = usePresenceOpen({ open, defaultOpen, onOpenChange })

  return (
    <PopoverOpenContext value={presence.isOpen}>
      <PopoverPrimitive.Root
        data-slot="popover"
        open={presence.isOpen}
        onOpenChange={presence.onOpenChange}
        {...props}
      />
    </PopoverOpenContext>
  )
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  children,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const open = React.use(PopoverOpenContext)

  return (
    <AnimatePresence>
      {open ? (
        <PopoverPrimitive.Portal forceMount>
          <PopoverPrimitive.Content
            forceMount
            asChild
            align={align}
            sideOffset={sideOffset}
            {...props}
          >
            <m.div
              data-slot="popover-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: DURATION.reaction, ease: EASE }}
              className={cn(
                'bg-popover text-popover-foreground z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
                className,
              )}
            >
              {children}
            </m.div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="popover-header"
      className={cn('flex flex-col gap-1 text-sm', className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <div
      data-slot="popover-title"
      className={cn('font-medium', className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="popover-description"
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
