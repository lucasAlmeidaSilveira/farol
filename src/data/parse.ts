import type { DocumentSnapshot, QuerySnapshot } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import type { ZodType } from 'zod'

/**
 * A fronteira entre o Firestore (que não tem tipos) e o domínio.
 *
 * Deliberadamente NÃO usamos `FirestoreDataConverter`: o converter precisa
 * devolver um valor para cada documento, então um documento corrompido derruba
 * a tela inteira. Aqui, um documento inválido é registrado e descartado — o mês
 * continua abrindo, com o resto dos dados.
 *
 * Para um app de dinheiro, essa é a escolha certa: é melhor mostrar 19 dos 20
 * lançamentos e um aviso do que uma tela de erro.
 */

/**
 * Firestore devolve `Timestamp` nos campos de auditoria, e o domínio trabalha
 * com strings ISO. `serverTimestamps: 'estimate'` evita que `createdAt` venha
 * `null` numa escrita ainda não confirmada pelo servidor.
 */
function normalize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(normalize)

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalize(item),
      ]),
    )
  }

  return value
}

export type ParseResult<T> = {
  items: T[]
  /** Documentos descartados por não passarem no schema. */
  invalidIds: string[]
}

export function parseSnapshot<T>(
  snapshot: QuerySnapshot,
  schema: ZodType<T>,
  label: string,
): ParseResult<T> {
  const items: T[] = []
  const invalidIds: string[] = []

  for (const document of snapshot.docs) {
    const raw = normalize({
      id: document.id,
      ...document.data({ serverTimestamps: 'estimate' }),
    })

    const result = schema.safeParse(raw)

    if (result.success) {
      items.push(result.data)
    } else {
      invalidIds.push(document.id)
      console.error(
        `[farol] documento inválido em ${label}/${document.id}`,
        result.error.issues,
      )
    }
  }

  return { items, invalidIds }
}

export function parseDocument<T>(
  snapshot: DocumentSnapshot,
  schema: ZodType<T>,
  label: string,
): T | null {
  if (!snapshot.exists()) return null

  const raw = normalize({
    id: snapshot.id,
    ...snapshot.data({ serverTimestamps: 'estimate' }),
  })

  const result = schema.safeParse(raw)

  if (!result.success) {
    console.error(
      `[farol] documento inválido em ${label}/${snapshot.id}`,
      result.error.issues,
    )
    return null
  }

  return result.data
}

/**
 * Metadados de sincronização do snapshot, propagados até a UI.
 *
 * `fromCache` diz que o dado veio do IndexedDB (offline ou ainda sem resposta
 * do servidor). `hasPendingWrites` diz que há escrita local ainda não
 * confirmada — é o que acende o relógio no item recém-lançado.
 */
export type SyncMeta = {
  fromCache: boolean
  hasPendingWrites: boolean
}

export const syncMetaOf = (
  snapshot: QuerySnapshot | DocumentSnapshot,
): SyncMeta => ({
  fromCache: snapshot.metadata.fromCache,
  hasPendingWrites: snapshot.metadata.hasPendingWrites,
})
