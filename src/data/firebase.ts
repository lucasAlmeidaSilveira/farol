import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

/**
 * O único ponto do app que inicializa o Firebase.
 *
 * Nada da config aqui é segredo: `apiKey` e companhia vão para o bundle por
 * design. A `apiKey` do Firebase Web NÃO é uma credencial — é um identificador
 * de roteamento e não autoriza nada. Quem defende os dados é o Auth (quem você
 * é) somado às Security Rules (o que você pode). Segredo de verdade — chave de
 * service account, .p8 da Apple — nunca entra num `NEXT_PUBLIC_`.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// getApps() evita reinicializar no Fast Refresh do Next.
const app = getApps().length > 0 ? getApp() : initializeApp(config)

export const auth = getAuth(app)

/**
 * `initializeFirestore` (e não `getFirestore`) porque precisamos passar o cache
 * local. `persistentLocalCache` substitui o `enableIndexedDbPersistence`, que
 * está deprecado.
 *
 * O try/catch cobre Safari em navegação privada e pressão de armazenamento, onde
 * o IndexedDB pode não estar disponível: o app continua funcionando, só perde o
 * cache entre sessões.
 */
export const db = initializeFirestore(app, {
  localCache: safeLocalCache(),
})

function safeLocalCache() {
  try {
    return persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  } catch {
    return memoryLocalCache()
  }
}

// A flag global evita que o Fast Refresh tente conectar duas vezes ao emulador,
// o que faz o SDK lançar.
declare global {
  var __farolEmulatorsConnected: boolean | undefined
}

if (
  process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' &&
  !globalThis.__farolEmulatorsConnected
) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  globalThis.__farolEmulatorsConnected = true
}
