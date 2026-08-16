'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'

/**
 * Seletor de tema com três opções.
 *
 * "Sistema" é o padrão e vem primeiro por um motivo: quem tem o celular no modo
 * escuro à noite espera que o app acompanhe, e ter que escolher manualmente é
 * uma decisão a mais num app que existe para tirar decisões da frente.
 *
 * O componente só renderiza depois de montar. Antes disso o `next-themes` ainda
 * não sabe qual tema está ativo, e marcar a opção errada por um frame produz um
 * piscar que parece bug.
 */

const OPTIONS = [
  { value: 'system', label: 'Sistema', glyph: '◐' },
  { value: 'light', label: 'Claro', glyph: '☀' },
  { value: 'dark', label: 'Escuro', glyph: '☾' },
] as const

const NO_OP_SUBSCRIBE = () => () => {}

export function ThemeToggle({ compact = false }: { compact?: boolean } = {}) {
  const { theme, setTheme } = useTheme()

  /*
    "Já hidratou?" sem `setState` dentro de efeito.
    `useSyncExternalStore` devolve o snapshot do servidor (false) durante o SSR
    e o do cliente (true) depois da hidratação — que é exatamente a informação
    necessária, sem o ciclo extra de render que o React 19 sinaliza.
  */
  const mounted = useSyncExternalStore(
    NO_OP_SUBSCRIBE,
    () => true,
    () => false,
  )

  return (
    <div
      role="radiogroup"
      aria-label="Tema do aplicativo"
      className="bg-muted flex gap-1 rounded-lg p-1"
    >
      {OPTIONS.map((option) => {
        const active = mounted && theme === option.value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-150',
              compact ? 'min-h-9 text-xs' : 'min-h-11 text-sm',
              active
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span aria-hidden="true">{option.glyph}</span>
            {/* No modo compacto o rótulo continua no DOM, só invisível: o
                leitor de tela precisa dele para distinguir os três botões. */}
            <span className={cn(compact && 'sr-only')}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
