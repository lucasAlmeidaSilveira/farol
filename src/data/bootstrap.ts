import {
  collection,
  doc,
  type Firestore,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import type { SpaceId } from '@/domain/types'

/**
 * Garante que a pessoa tem perfil e espaço financeiro. Roda no primeiro login.
 *
 * AS TRÊS ESCRITAS SÃO SEQUENCIAIS, NUNCA UM writeBatch.
 *
 * As Security Rules não enxergam escritas pendentes do mesmo lote. A regra que
 * cria o documento de dono faz `get(space)` para conferir quem criou o espaço —
 * dentro de um batch esse `get` não acharia nada, e o lote INTEIRO seria
 * recusado. Trocar a ordem por um batch exigiria afrouxar a regra, o que
 * abriria uma brecha para alguém criar um documento de dono num espaço alheio.
 *
 * O preço é não ter atomicidade. A falha é benigna: um espaço sem membro é
 * invisível (ninguém consegue lê-lo) e a próxima tentativa recomeça o fluxo.
 *
 * A instância do Firestore entra por parâmetro em `bootstrapSpace` para que o
 * teste de integração exercite ESTA função contra o emulador — foi a ausência
 * disso que deixou passar um `doc(db, 'spaces')` de caminho ímpar.
 */

export type BootstrapProfile = {
  uid: string
  name: string | null
  email: string | null
  photoUrl: string | null
}

export async function bootstrapSpace(
  firestore: Firestore,
  profile: BootstrapProfile,
): Promise<SpaceId> {
  const userRef = doc(firestore, 'users', profile.uid)
  const existing = await getDoc(userRef)

  const currentSpaceId = existing.exists()
    ? (existing.data().activeSpaceId as SpaceId | undefined)
    : undefined

  if (currentSpaceId) {
    const membership = await getDoc(
      doc(firestore, 'spaces', currentSpaceId, 'members', profile.uid),
    )
    if (membership.exists()) return currentSpaceId
  }

  // `doc(collection(...))` gera um id novo sem ir ao servidor. `doc(db,
  // 'spaces')` seria um caminho ÍMPAR — referência de coleção, não de
  // documento — e o SDK rejeita.
  const spaceId = doc(collection(firestore, 'spaces')).id as SpaceId

  // A Apple envia o nome UMA ÚNICA VEZ, na primeira autorização. Se vier nulo
  // aqui, o onboarding pede — nunca gravamos nome vazio.
  const name = profile.name?.trim() || 'Você'

  // 1. O espaço.
  await setDoc(doc(firestore, 'spaces', spaceId), {
    name: 'Meu espaço',
    config: {
      cycleStart: { type: 'dayOfMonth', day: 1 },
      variableIncomePolicy: 'confirmedOnly',
      timeZone: 'America/Sao_Paulo',
      currency: 'BRL',
    },
    createdBy: profile.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // 2. O documento de membro. Só passa porque o espaço já está commitado.
  await setDoc(doc(firestore, 'spaces', spaceId, 'members', profile.uid), {
    uid: profile.uid,
    spaceId,
    role: 'owner',
    status: 'active',
    name,
    email: profile.email,
    photoUrl: profile.photoUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // 3. O perfil apontando para o espaço. A regra confere que somos membros —
  //    por isso vem por último.
  await setDoc(
    userRef,
    {
      name,
      email: profile.email,
      photoUrl: profile.photoUrl,
      activeSpaceId: spaceId,
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  return spaceId
}
