import './globals.css'

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import { Providers } from '@/providers/providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
