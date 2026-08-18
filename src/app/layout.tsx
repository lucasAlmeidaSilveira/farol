import './globals.css'

import { SerwistProvider } from '@serwist/turbopack/react'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import { OfflineBar } from '@/components/shell/offline-bar'
import { SITE_URL } from '@/lib/site'
import { Providers } from '@/providers/providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  // Base das URLs absolutas (canônico, OG, sitemap). Sem ela o Next monta as
  // tags de compartilhamento em caminho relativo e a prévia do link chega
  // quebrada em WhatsApp e Telegram.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Farol — clareza sobre o seu dinheiro',
    template: '%s · Farol',
  },
  description: 'Quanto você pode gastar este mês.',
  applicationName: 'Farol',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Farol',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    // Sem isto, o iOS transforma valores em links de telefone.
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // `cover` para o app ocupar a tela toda em telas com notch;
  // `resizes-content` para o teclado do Android não empurrar o layout.
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5faf7' },
    { media: '(prefers-color-scheme: dark)', color: '#08201a' },
  ],
}

const NOSCRIPT_REVEAL = `[data-reveal]{opacity:1!important;filter:none!important;transform:none!important}`

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh">
        {/*
          O seguro contra a tela em branco.

          O Motion escreve o estado inicial da animação já no HTML do servidor —
          `opacity: 0` incluso. Se o JavaScript não carregar, nada apareceria, e
          uma tela vazia é pior do que uma tela sem animação nenhuma. Esta regra
          devolve todo elemento animado ao estado final, e só é aplicada
          exatamente no cenário em que ninguém mais pode fazer isso.
        */}
        <noscript>
          <style>{NOSCRIPT_REVEAL}</style>
        </noscript>

        <SerwistProvider swUrl="/serwist/sw.js">
          <Providers>
            {/* No topo de tudo, para valer em qualquer rota — inclusive
                /entrar, onde ficar offline é a única limitação real. */}
            <OfflineBar />
            {children}
          </Providers>
        </SerwistProvider>
      </body>
    </html>
  )
}
