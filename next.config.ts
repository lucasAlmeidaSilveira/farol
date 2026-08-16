import { withSerwist } from '@serwist/turbopack'
import type { NextConfig } from 'next'

/**
 * O projeto Firebase de destino do proxy de autenticação. Sai do mesmo env var
 * que o resto da config, então dev e produção se resolvem sozinhos.
 */
const firebaseProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.9'],

  /**
   * Proxy do handler de autenticação do Firebase para o NOSSO domínio.
   *
   * Existe por um bug real, relatado no celular: a pessoa escolhia a conta do
   * Google, voltava para o app e continuava deslogada — sem erro nenhum na
   * tela, o que é o pior tipo de falha.
   *
   * A causa: no celular o popup costuma ser bloqueado, e o login cai no
   * `signInWithRedirect`. Esse fluxo guarda estado no domínio do handler
   * (`<projeto>.firebaseapp.com`), que é TERCEIRO em relação ao app. Safari com
   * ITP, Firefox com Total Cookie Protection e Chrome com storage particionado
   * bloqueiam esse storage, então na volta o `getRedirectResult` não encontra
   * nada e devolve vazio — silenciosamente.
   *
   * Servindo o handler pelo nosso próprio domínio, ele deixa de ser terceiro e
   * o storage volta a ser acessível. É a solução documentada pelo Firebase
   * ("reverse proxy"), e ela exige três peças juntas:
   *
   *   1. este rewrite;
   *   2. `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` apontando para o domínio do app;
   *   3. o mesmo domínio nas Authorized redirect URIs do cliente OAuth, no
   *      Google Cloud — sem isso o Google recusa com `redirect_uri_mismatch`.
   *
   * Nenhuma rota do app começa com `/__/`, então não há risco de colisão.
   */
  async rewrites() {
    if (!firebaseProject) return []

    const handler = `https://${firebaseProject}.firebaseapp.com`

    return [
      { source: '/__/auth/:path*', destination: `${handler}/__/auth/:path*` },
    ]
  },
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
