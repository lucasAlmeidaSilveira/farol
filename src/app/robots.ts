import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'

/**
 * O que os buscadores devem ler.
 *
 * Só a parte pública. As rotas do app renderizam no cliente e exigem sessão —
 * um robô que as visite indexa uma casca vazia, e casca vazia indexada é
 * conteúdo sem valor competindo com a única página que deveria ranquear.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/hoje', '/plano', '/mes', '/ajustes', '/onboarding', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
