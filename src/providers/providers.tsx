'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

import { TooltipProvider } from '@/components/ui/tooltip'

import { AuthProvider } from './auth-provider'
import { QueryProvider } from './query-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
          <Toaster
            position="top-center"
            richColors
            closeButton
            // Toque errado num app de dinheiro é comum; 7s dá tempo real de
            // desfazer sem obrigar a confirmar tudo antes.
            duration={7000}
          />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}
