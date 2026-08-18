'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { FarolLockup } from '@/components/brand/farol-lockup'
import { FarolMark } from '@/components/brand/farol-mark'
import { AccountMenu } from '@/components/shared/account-menu'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { NAV_ITEMS } from './nav-items'
import { useQuickEntry } from './quick-entry-context'

/**
 * A navegação do desktop, com estado recolhido.
 *
 * As boas práticas que a versão recolhida exige, e que são o motivo de o
 * componente ser mais longo do que parece:
 *
 * - O RÓTULO NUNCA SOME DA ÁRVORE. Recolhido, ele vira `sr-only`. Esconder com
 *   `display:none` deixaria o item mudo para leitor de tela, e o ícone sozinho
 *   não diz nada.
 * - TOOLTIP no lugar do rótulo, só quando recolhido. Sem ele, o ícone vira
 *   adivinhação — e ícones de navegação são notoriamente ambíguos.
 * - O ESTADO PERSISTE. Recolher é uma escolha sobre o próprio espaço de tela;
 *   reabrir sozinho a cada navegação transformaria a opção em irritação.
 * - ATALHO Cmd/Ctrl + [, a convenção de editores e ferramentas de trabalho.
 * - `aria-expanded` no botão, para a mudança ser anunciada.
 * - A LARGURA É UM TOKEN CSS (`--sidebar-w`), consumido também pelo conteúdo,
 *   para os dois nunca saírem de sincronia.
 */

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()
  const quickEntry = useQuickEntry()

  return (
    <aside
      data-collapsed={collapsed}
      style={{ width: 'var(--sidebar-w)' }}
      className={cn(
        'border-border bg-card fixed inset-y-0 left-0 z-30 hidden flex-col border-r lg:flex',
        'transition-[width] duration-200 ease-out',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-6',
          collapsed && 'justify-center px-0',
        )}
      >
        {collapsed ? (
          /*
            Recolhida, a área da logo VIRA o botão de expandir: o símbolo dá
            lugar à seta ao passar o mouse ou ao receber foco.

            Optei por trocar o conteúdo em vez de sobrepor um botão à logo —
            dois elementos interativos empilhados no mesmo ponto confundem
            navegação por teclado e leitor de tela. A logo perde o clique para
            a home, que continua a um item de distância na navegação.
          */
          <WithTooltip label="Expandir menu · ⌘[" show>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={false}
              aria-label="Expandir menu"
              className="group hover:bg-muted focus-visible:ring-ring relative flex size-12 items-center justify-center rounded-lg transition-colors duration-150 focus-visible:ring-2"
            >
              <FarolMark
                size={28}
                className="transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0"
              />
              <span
                aria-hidden="true"
                className="text-muted-foreground absolute text-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                ›
              </span>
            </button>
          </WithTooltip>
        ) : (
          <>
            <Link
              href="/hoje"
              aria-label="Farol — início"
              className="flex min-w-0 flex-1"
            >
              <FarolLockup size={28} />
            </Link>
            <ToggleButton collapsed={collapsed} onToggle={onToggle} />
          </>
        )}
      </div>

      <div className={cn('px-4', collapsed && 'px-2')}>
        <WithTooltip label="Novo lançamento" show={collapsed}>
          <Button
            onClick={quickEntry.open}
            size={collapsed ? 'icon-lg' : 'lg'}
            className={cn('w-full', collapsed && 'w-12')}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            <span className={cn(collapsed && 'sr-only')}>Novo lançamento</span>
          </Button>
        </WithTooltip>
      </div>

      <nav
        aria-label="Navegação principal"
        className={cn('flex-1 px-4 py-6', collapsed && 'px-2')}
      >
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href

            return (
              <li key={item.href}>
                <WithTooltip label={item.label} show={collapsed}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-start gap-3 rounded-lg transition-colors duration-150',
                      collapsed
                        ? 'size-12 items-center justify-center'
                        : 'px-3 py-2.5',
                      active
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'text-base leading-none',
                        !collapsed && 'mt-0.5',
                      )}
                    >
                      {item.glyph}
                    </span>

                    {/* Recolhido o rótulo continua na árvore, só invisível:
                        sumir com ele deixaria o item mudo para leitor de tela. */}
                    <span
                      className={cn('flex flex-col', collapsed && 'sr-only')}
                    >
                      <span
                        className={cn('text-sm', active && 'font-semibold')}
                      >
                        {item.label}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {item.hint}
                      </span>
                    </span>
                  </Link>
                </WithTooltip>
              </li>
            )
          })}
        </ul>
      </nav>

      <Separator />

      <div
        className={cn(
          'flex flex-col gap-4 px-4 py-5',
          collapsed && 'items-center px-2',
        )}
      >
        {collapsed ? null : <ThemeToggle compact />}

        {/* O avatar É o menu da conta. Antes era um `div` inerte com toda a
            aparência de menu — e sair vivia só no fim de Ajustes. */}
        <AccountMenu
          compact={collapsed}
          side={collapsed ? 'right' : 'top'}
          align={collapsed ? 'end' : 'start'}
          className={collapsed ? 'justify-center' : 'w-full'}
        />
      </div>
    </aside>
  )
}

/** O botão de recolher, visível só com a barra expandida. */
function ToggleButton({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <WithTooltip label="Recolher menu · ⌘[" show>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label="Recolher menu"
        className="text-muted-foreground shrink-0"
      >
        <span aria-hidden="true">‹</span>
      </Button>
    </WithTooltip>
  )
}

/** Tooltip só quando o rótulo não está visível — senão vira ruído redundante. */
function WithTooltip({
  label,
  show,
  children,
}: {
  label: string
  show: boolean
  children: React.ReactNode
}) {
  if (!show) return <>{children}</>

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
