'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { UserAvatar } from '@/components/shared/user-avatar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { signOutOfFarol } from '@/data/session'
import { cn } from '@/lib/utils'
import { useSession } from '@/providers/auth-provider'

/**
 * A conta, atrás do avatar.
 *
 * Sair existia só no fim de Ajustes, depois de cinco outras seções — ou seja,
 * existia sem ser encontrável. E o avatar da barra lateral era um `div` inerte,
 * o que é pior do que não ter avatar nenhum: ele tem toda a aparência de um
 * menu de conta e não responde ao clique.
 *
 * Aqui o avatar passa a ser o botão que todo app coloca nesse lugar, presente
 * em qualquer largura — barra lateral no desktop, cabeçalho no celular.
 *
 * Sair NÃO pede confirmação, pela mesma regra que apagar lançamento não pede:
 * confirmação cobra atrito de toda ação, inclusive das certas. Sair é
 * reversível — o custo de errar é um login.
 */

export function AccountMenu({
  compact = false,
  withSettings = true,
  align = 'end',
  side,
  className,
}: {
  /** Só o avatar, sem o nome ao lado. */
  compact?: boolean
  /**
   * Desligue no onboarding: Ajustes lê o espaço financeiro, que ainda não
   * existe até o fluxo terminar — o atalho levaria a uma tela pela metade.
   */
  withSettings?: boolean
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}) {
  const router = useRouter()
  const { user } = useSession()
  const [open, setOpen] = useState(false)

  const name = user?.displayName ?? 'Você'
  const email = user?.email ?? ''

  async function leave() {
    setOpen(false)
    await signOutOfFarol()
    router.replace('/entrar')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Conta de ${name}`}
          className={cn(
            'focus-visible:ring-ring flex items-center gap-2.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
            compact ? 'shrink-0' : 'hover:bg-muted min-w-0 px-1 py-1',
            className,
          )}
        >
          <UserAvatar />
          {!compact ? (
            <span className="text-muted-foreground min-w-0 truncate text-xs">
              {user?.displayName ?? email}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent align={align} side={side} className="w-64 p-2">
        <div className="flex items-center gap-3 p-2">
          <UserAvatar className="size-10" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{name}</span>
            {email ? (
              <span className="text-muted-foreground truncate text-xs">
                {email}
              </span>
            ) : null}
          </div>
        </div>

        <Separator className="my-1" />

        {withSettings ? (
          <Link
            href="/ajustes"
            onClick={() => setOpen(false)}
            className="hover:bg-muted focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
          >
            <span aria-hidden="true" className="text-muted-foreground">
              ⚙
            </span>
            Ajustes
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => void leave()}
          className="hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <span aria-hidden="true" className="text-muted-foreground">
            ⏻
          </span>
          Sair da conta
        </button>
      </PopoverContent>
    </Popover>
  )
}
