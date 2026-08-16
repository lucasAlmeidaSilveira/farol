'use client'

import type { ProviderId } from '@/data/auth-providers'
import { cn } from '@/lib/utils'

import { AppleMark, GoogleG } from './provider-logos'

/**
 * O botão de login de cada provedor, na aparência que ELE define.
 *
 * Não usa o `Button` do design system de propósito. Botão social não segue a
 * marca do app: as diretrizes de Google e Apple especificam fundo, borda,
 * contraste e a própria palavra do rótulo, e essa padronização é o que faz a
 * pessoa reconhecer o botão sem ler — o mesmo selo que ela já viu em dezenas
 * de outros apps. Pintar de verde-Farol economizaria código e custaria
 * exatamente a familiaridade que o botão existe para dar.
 *
 * As cores são literais e sem token de tema porque são de OUTRA marca. O que
 * varia com o tema claro/escuro é apenas o par que cada guideline define.
 */

const STYLES: Record<ProviderId, string> = {
  // Branco no claro, quase-preto no escuro — os dois pares oficiais do Google.
  google: cn(
    'border-[#747775] bg-white text-[#1F1F1F] hover:bg-[#F7F8F8] active:bg-[#EEF0F1]',
    'dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3] dark:hover:bg-[#1D1D1F] dark:active:bg-[#232326]',
  ),
  // A Apple inverte: preto no claro, branco no escuro.
  apple: cn(
    'border-black bg-black text-white hover:bg-[#1A1A1A]',
    'dark:border-white dark:bg-white dark:text-black dark:hover:bg-[#F0F0F0]',
  ),
}

const LOGOS: Record<ProviderId, React.ComponentType<{ size?: number }>> = {
  google: GoogleG,
  apple: AppleMark,
}

export function ProviderButton({
  provider,
  label,
  onClick,
  disabled,
}: {
  provider: ProviderId
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  const Logo = LOGOS[provider]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // 48px de altura: as diretrizes pedem 40 no mínimo, mas o alvo de toque
        // do projeto é 44, e este botão é o único caminho para dentro do app.
        'flex h-12 w-full items-center justify-center gap-3 rounded-lg border',
        'text-[15px] font-medium tracking-[-0.01em]',
        'transition-colors duration-150',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-background outline-none',
        'disabled:pointer-events-none disabled:opacity-60',
        STYLES[provider],
      )}
    >
      <Logo size={18} />
      {label}
    </button>
  )
}
