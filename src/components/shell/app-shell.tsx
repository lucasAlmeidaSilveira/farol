'use client'

import { useCallback, useMemo, useState } from 'react'

import { IncomeImpactSheet } from '@/components/entries/income-impact-sheet'
import { QuickEntrySheet } from '@/components/entries/quick-entry-sheet'
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

  const [entryOpen, setEntryOpen] = useState(false)
  const [impact, setImpact] = useState<IncomeImpact | null>(null)

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
          {children}
        </div>

        {canLaunch ? (
          <>
            <MobileNav />

            <QuickEntrySheet
              open={entryOpen}
              onOpenChange={setEntryOpen}
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
