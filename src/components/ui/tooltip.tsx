'use client'

import { AnimatePresence, m } from 'motion/react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import * as React from 'react'

import { DURATION, EASE } from '@/components/motion/transitions'
import { usePresenceOpen } from '@/components/motion/use-presence-open'
import { cn } from '@/lib/utils'

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

const TooltipOpenContext = React.createContext(false)

/**
 * Dica com entrada e saída animadas.
 *
 * Aqui a duração é a mais curta do sistema: uma dica que demora a sumir fica
 * no caminho do próximo clique, e a pessoa já leu antes de a animação acabar.
 */
function Tooltip({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const presence = usePresenceOpen({ open, defaultOpen, onOpenChange })

  return (
    <TooltipOpenContext value={presence.isOpen}>
      <TooltipPrimitive.Root
        data-slot="tooltip"
        open={presence.isOpen}
        onOpenChange={presence.onOpenChange}
        {...props}
      />
    </TooltipOpenContext>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const open = React.use(TooltipOpenContext)

  return (
    <AnimatePresence>
      {open ? (
        <TooltipPrimitive.Portal forceMount>
          <TooltipPrimitive.Content
            forceMount
            asChild
            sideOffset={sideOffset}
            {...props}
          >
            <m.div
              data-slot="tooltip-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: DURATION.reaction, ease: EASE }}
              className={cn(
                'bg-foreground text-background z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
                className,
              )}
            >
              {children}
              <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
            </m.div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
