'use client'

import { usePathname } from 'next/navigation'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

import { TooltipProvider } from '@/components/ui/tooltip'

import { AuthProvider } from './auth-provider'
import { QueryProvider } from './query-provider'

/**
 * Rotas que ignoram a preferência de tema e renderizam sempre no claro.
 *
 * São as duas telas de VITRINE — a landing e a entrada. Quem chega nelas
 * muitas vezes ainda não é usuário e nunca escolheu tema nenhum: o que o
 * navegador reporta é a preferência do sistema, não uma decisão sobre o Farol.
 * Fixar o claro dá a essas telas um enquadramento único e previsível, que é
 * também o que a arte da marca assume.
 *
 * As duas juntas, e não só a entrada, porque elas são a mesma sequência: a
 * landing termina num botão que leva ao login, e trocar de esquema de cor no
 * meio de um funil de dois passos lê como se fossem dois produtos diferentes.
 * Dentro do app, a preferência volta a valer.
 */
const FORCE_LIGHT = new Set(['/', '/entrar'])

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      /*
        Condicional no provider ÚNICO, e não um `ThemeProvider` aninhado só
        para a rota: dois providers escrevendo no mesmo `<html>` brigam, e ao
        sair da tela o tema do usuário poderia não voltar. Quando isto vira
        `undefined`, o next-themes reaplica a preferência salva sozinho.
      */
      forcedTheme={FORCE_LIGHT.has(pathname) ? 'light' : undefined}
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
