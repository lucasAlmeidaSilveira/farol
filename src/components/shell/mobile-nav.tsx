'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

import { NAV_ITEMS } from './nav-items'
import { useQuickEntry } from './quick-entry-context'

/**
 * A navegação abaixo de `lg`: barra inferior mais botão flutuante central.
 *
 * O botão fica no meio e a barra abre espaço para ele, em vez de ele flutuar
 * por cima — sobreposto, ele cobriria justamente o item de navegação que estiver
 * embaixo, e num app usado com uma mão só isso vira toque errado.
 */
export function MobileNav() {
  const pathname = usePathname()
  const quickEntry = useQuickEntry()

  return (
    <>
      <button
        type="button"
        aria-label="Novo lançamento"
        onClick={quickEntry.open}
        className={cn(
          'bg-primary text-primary-foreground fixed left-1/2 z-40 flex size-14 -translate-x-1/2 items-center justify-center rounded-full text-2xl shadow-lg lg:hidden',
          'bottom-[max(1.15rem,calc(env(safe-area-inset-bottom)+0.65rem))]',
          'transition-transform duration-150 active:scale-95',
        )}
      >
        <span aria-hidden="true">+</span>
      </button>

      <nav
        aria-label="Navegação principal"
        className="bg-card/95 border-border fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex w-full max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
          {NAV_ITEMS.map((item, index) => {
            const active = pathname === item.href

            return (
              <li
                key={item.href}
                className={cn(
                  'flex-1',
                  index === 1 && 'mr-9',
                  index === 2 && 'ml-9',
                )}
              >
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs transition-colors duration-150',
                    active
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground',
                  )}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {item.glyph}
                  </span>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
