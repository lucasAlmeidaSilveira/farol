import { createSerwistRoute } from '@serwist/turbopack'

/**
 * Rota que compila e serve o service worker.
 *
 * A `revision` é o que invalida o cache da página offline entre versões. Em
 * produção vem do commit do deploy (estável dentro de um deploy, diferente a
 * cada um); fora dela, um valor novo por build — que é justamente o que se quer
 * em desenvolvimento, para nunca depurar contra um shell velho.
 */
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? crypto.randomUUID()

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: '/~offline', revision }],
    swSrc: 'src/app/sw.ts',
    useNativeEsbuild: true,
  })
