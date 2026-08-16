import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Farol — clareza sobre o seu dinheiro',
    short_name: 'Farol',
    description: 'Quanto você pode gastar este mês.',
    start_url: '/?src=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'pt-BR',
    dir: 'ltr',
    // A tela de abertura é verde-profundo: o farol brilha no escuro.
    background_color: '#0E3A2E',
    theme_color: '#0E3A2E',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Lancei um gasto', url: '/novo?kind=expense' },
      { name: 'Entrou dinheiro', url: '/novo?kind=income' },
    ],
  }
}
