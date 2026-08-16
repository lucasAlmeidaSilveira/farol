import { withSerwist } from '@serwist/turbopack'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.9'],
}

/**
 * O service worker existe por uma promessa específica do produto: "consulte seu
 * número a qualquer hora". Sem ele, abrir o app sem rede dá a tela do
 * dinossauro — o que quebra a promessa justamente no momento em que ela mais
 * vale (fila do mercado, sinal ruim).
 *
 * O Firestore já mantém os dados offline em IndexedDB; o SW só garante que o
 * shell do app chegue à tela para poder lê-los.
 */
export default withSerwist(nextConfig)
