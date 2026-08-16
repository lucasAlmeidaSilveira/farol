'use client'

import { useSyncExternalStore } from 'react'

/**
 * Se o navegador acha que há rede.
 *
 * `useSyncExternalStore` em vez de `useState` + `useEffect`: o valor vive fora
 * do React (é do navegador), e ler por efeito produziria um frame inicial
 * errado — além de cair na regra de set-state-in-effect do React 19.
 *
 * Vale o aviso: `navigator.onLine` responde "existe interface de rede", não
 * "a internet funciona". Wi-Fi de aeroporto sem autenticar aparece como online.
 * Por isso o indicador que usa este hook é informativo e nunca desabilita nada
 * — quem decide de fato é a fila de escritas do Firestore, que só confirma o
 * que o servidor aceitou.
 */
function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    // No servidor não há navegador: assumir online evita renderizar o aviso no
    // HTML e removê-lo na hidratação, que piscaria em toda primeira carga.
    () => true,
  )
}
