import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'

/**
 * O sitemap tem uma entrada só, e está certo: a landing é a única página que
 * faz sentido indexar. `/entrar` é um formulário, e o resto exige sessão.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
