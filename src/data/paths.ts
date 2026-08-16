import { collection, doc } from 'firebase/firestore'

import type { Period } from '@/domain/period'
import type { SpaceId } from '@/domain/types'

import { db } from './firebase'

/**
 * Todos os caminhos do Firestore num lugar só, tipados.
 *
 * Nenhum outro arquivo escreve string de coleção à mão — é o que garante que
 * renomear uma coleção seja uma mudança de uma linha, e que nada acesse dado
 * financeiro fora da fronteira do `Space`.
 */

export const userDoc = (uid: string) => doc(db, 'users', uid)

export const spaceDoc = (spaceId: SpaceId) => doc(db, 'spaces', spaceId)

export const membersCollection = (spaceId: SpaceId) =>
  collection(db, 'spaces', spaceId, 'members')

export const memberDoc = (spaceId: SpaceId, uid: string) =>
  doc(db, 'spaces', spaceId, 'members', uid)

export const incomeSourcesCollection = (spaceId: SpaceId) =>
  collection(db, 'spaces', spaceId, 'incomeSources')

export const incomeSourceDoc = (spaceId: SpaceId, id: string) =>
  doc(db, 'spaces', spaceId, 'incomeSources', id)

export const commitmentsCollection = (spaceId: SpaceId) =>
  collection(db, 'spaces', spaceId, 'commitments')

export const commitmentDoc = (spaceId: SpaceId, id: string) =>
  doc(db, 'spaces', spaceId, 'commitments', id)

export const categoriesCollection = (spaceId: SpaceId) =>
  collection(db, 'spaces', spaceId, 'categories')

export const entriesCollection = (spaceId: SpaceId) =>
  collection(db, 'spaces', spaceId, 'entries')

export const entryDoc = (spaceId: SpaceId, id: string) =>
  doc(db, 'spaces', spaceId, 'entries', id)

/** O documento existe apenas quando o mês foi ajustado ou fechado. */
export const periodDoc = (spaceId: SpaceId, period: Period) =>
  doc(db, 'spaces', spaceId, 'periods', period)
