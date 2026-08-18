'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { RETURNING_CTA } from '@/content/landing'

/**
 * Dentro do app instalado, a landing nunca é o destino certo.
 *
 * Quem abriu pelo ícone da tela de início já decidiu — mostrar uma página que
 * apresenta o produto a essa pessoa é começar cobrando de novo uma escolha já
 * feita, e sem barra de endereço ela nem tem para onde ir.
 *
 * Isto também conserta as instalações antigas: elas guardaram `start_url` na
 * raiz, de quando `/` era a tela Hoje, e o manifesto novo só vale depois que o
 * navegador reler o arquivo — o que pode demorar dias.
 *
 * Duas checagens porque o iOS é a exceção de sempre: o Safari só passou a
 * reportar `display-mode: standalone` recentemente, e `navigator.standalone` é
 * a forma que funciona nas versões anteriores.
 */
export function StandaloneRedirect() {
  const router = useRouter()

  useEffect(() => {
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      // Propriedade só do Safari, ausente da tipagem padrão do navigator.
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    if (installed) router.replace(RETURNING_CTA.href)
  }, [router])

  return null
}
