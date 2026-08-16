/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from '@serwist/turbopack/worker'
import { type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * O service worker do Farol — deliberadamente mínimo.
 *
 * Ele NÃO faz cache de dados financeiros: quem cuida disso é a persistência do
 * próprio Firestore (IndexedDB), que já sabe reconciliar escritas pendentes ao
 * reconectar. Duplicar esse cache aqui criaria duas fontes de verdade offline,
 * com uma delas garantidamente desatualizada.
 *
 * O papel dele é só um: entregar o shell do app à tela mesmo sem rede, para que
 * a camada do Firestore consiga rodar e mostrar o número já conhecido.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Um SW velho servindo um shell novo (ou o contrário) é fonte de bug fantasma
  // difícil de reproduzir. Trocar na hora vale mais que preservar a aba antiga.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()
