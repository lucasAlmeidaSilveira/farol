'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { FarolLockup } from '@/components/brand/farol-lockup'
import { IncomeImpactSheet } from '@/components/entries/income-impact-sheet'
import { QuickEntrySheet } from '@/components/entries/quick-entry-sheet'
import { AccountMenu } from '@/components/shared/account-menu'
import { calendarPeriodOf, todayIn } from '@/domain/period'
import type { IncomeImpact } from '@/engine'
import { useMonthSummary } from '@/hooks/summary/use-month-summary'
import { cn } from '@/lib/utils'

import { MobileNav } from './mobile-nav'
import { QuickEntryContext } from './quick-entry-context'
import { Sidebar } from './sidebar'
import { useSidebarState } from './use-sidebar-state'

/**
 * A casca do app: desktop-first, com o celular como adaptação.
 *
 * No desktop a navegação é uma barra lateral fixa e o conteúdo respira em
 * várias colunas. Abaixo de `lg` a mesma navegação vira barra inferior com
 * botão central, porque no celular o alcance do polegar manda.
 *
 * O `useMonthSummary` é chamado aqui e também dentro de cada tela. Isso NÃO
 * gera leitura extra: o registry de subscriptions conta referências pela
 * `queryKey`, então casca e tela compartilham exatamente os mesmos listeners.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [period] = useState(() =>
    calendarPeriodOf(todayIn('America/Sao_Paulo')),
  )
  const { input, needsOnboarding, isPending } = useMonthSummary(period)

  const { collapsed, toggle } = useSidebarState()

  /*
    Atalho do PWA: `/?novo=expense` abre o lançamento já na tela Hoje.

    Lido de `window.location` e não de `useSearchParams()` de propósito — o
    hook obrigaria estas páginas estáticas a uma fronteira de Suspense só para
    ler um parâmetro que existe uma única vez, na abertura.
  */
  const [deepLink] = useState<'expense' | 'income' | null>(() => {
    if (typeof window === 'undefined') return null
    const value = new URLSearchParams(window.location.search).get('novo')
    return value === 'expense' || value === 'income' ? value : null
  })

  const [entryOpen, setEntryOpen] = useState(deepLink !== null)
  const [impact, setImpact] = useState<IncomeImpact | null>(null)

  // Limpa o parâmetro para que recarregar a página não reabra o lançamento.
  useEffect(() => {
    if (deepLink === null) return
    window.history.replaceState(null, '', window.location.pathname)
  }, [deepLink])

  const open = useCallback(() => setEntryOpen(true), [])
  const quickEntry = useMemo(() => ({ open }), [open])

  // Sem plano montado não há o que lançar, e o CTA da tela vazia é outro.
  const canLaunch = !isPending && !needsOnboarding

  return (
    <QuickEntryContext value={quickEntry}>
      {/*
        A largura vive num token CSS consumido pela barra E pelo conteúdo, para
        os dois nunca saírem de sincronia — o bug clássico de sidebar retrátil
        é a margem do conteúdo esquecer de acompanhar.
      */}
      <div
        className="min-h-dvh"
        style={
          {
            '--sidebar-w': collapsed ? '4.5rem' : '16.5rem',
          } as React.CSSProperties
        }
      >
        {canLaunch ? <Sidebar collapsed={collapsed} onToggle={toggle} /> : null}

        <div
          className={cn(
            canLaunch && 'lg:pl-(--sidebar-w)',
            'transition-[padding] duration-200 ease-out',
          )}
        >
          {/*
            Sem plano montado não há barra lateral — e era ali que a conta
            morava no desktop. Sem isto, quem entrou com a conta errada e caiu
            no farol apagado não tem por onde sair: não há navegação, não há
            Ajustes, e o único botão da tela leva ao onboarding.

            Só em `lg`: no celular o cabeçalho da própria tela já traz o avatar.
          */}
          {!canLaunch ? (
            <div className="hidden items-center justify-between px-10 pt-6 lg:flex">
              <Link href="/" aria-label="Farol — início">
                <FarolLockup size={26} />
              </Link>
              <AccountMenu compact />
            </div>
          ) : null}

          {children}
        </div>

        {canLaunch ? (
          <>
            <MobileNav />

            <QuickEntrySheet
              open={entryOpen}
              onOpenChange={setEntryOpen}
              defaultKind={deepLink ?? 'expense'}
              engineInput={input}
              onIncomeRegistered={setImpact}
            />

            <IncomeImpactSheet
              open={impact !== null}
              onOpenChange={(isOpen) => !isOpen && setImpact(null)}
              impact={impact}
            />
          </>
        ) : null}
      </div>
    </QuickEntryContext>
  )
}
