import { doc, setDoc } from 'firebase/firestore'

import type { DefaultCategory } from '@/domain/categories'
import type { SpaceId } from '@/domain/types'

import { categoriesCollection } from './paths'

/**
 * Garante que a categoria existe antes de um lançamento apontar para ela.
 *
 * O lançamento grava `categoryId` com um slug fixo, então o documento precisa
 * existir para a referência não ficar solta. Escrever a cada lançamento
 * funcionaria — `merge` é idempotente — mas seria uma escrita paga por gasto
 * registrado, e escrita no Firestore é dinheiro pela mesma razão que leitura é.
 *
 * Por isso o registro do que já foi garantido nesta sessão. O pior caso é uma
 * escrita redundante por categoria a cada abertura do app, e não uma por
 * lançamento. Falhou? Sai do registro, e a próxima tentativa reescreve.
 */
const ensured = new Set<string>()

export function ensureCategory(spaceId: SpaceId, category: DefaultCategory) {
  const key = `${spaceId}/${category.id}`
  if (ensured.has(key)) return

  ensured.add(key)

  // Sem await, como toda escrita do app: offline a promise não resolveria, e
  // segurar o lançamento por causa da categoria travaria o gesto principal.
  void setDoc(
    doc(categoriesCollection(spaceId), category.id),
    {
      name: category.name,
      color: category.color,
      essential: category.essential,
      archivedAt: null,
    },
    { merge: true },
  ).catch(() => {
    ensured.delete(key)
  })
}
