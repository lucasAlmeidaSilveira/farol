import type { User } from 'firebase/auth'

import { bootstrapSpace } from './bootstrap'
import { db } from './firebase'

/**
 * A ligação entre o bootstrap e a instância real do Firestore.
 *
 * Vive separado de `bootstrap.ts` de propósito: aquele arquivo não pode
 * importar `./firebase`, senão o teste de integração puxaria a inicialização
 * do Auth junto e quebraria em Node. Mesma separação usada em `payloads.ts` —
 * lógica pura de um lado, binding do outro.
 */
export const ensureUserAndSpace = (user: User) =>
  bootstrapSpace(db, {
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photoUrl: user.photoURL,
  })
