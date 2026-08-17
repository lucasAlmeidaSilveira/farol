'use client'

import { useMutation } from '@tanstack/react-query'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { toast } from 'sonner'

import { ensureCategory } from '@/data/ensure-category'
import { entriesCollection, entryDoc } from '@/data/paths'
import { type EntryInput, entryPayload } from '@/data/payloads'
import { errorMessage } from '@/data/session'
import { DEFAULT_CATEGORIES } from '@/domain/categories'
import type { EntryId } from '@/domain/types'
import { useSpace } from '@/hooks/space/use-space'
import { markFirstEntry } from '@/lib/engagement'
import { useSession } from '@/providers/auth-provider'

export type { EntryInput as NewEntry }

/**
 * Cria um lançamento. Offline-first de verdade.
 *
 * O detalhe que quebra a maioria dos apps com Firestore: OFFLINE, a promise do
 * `setDoc` NÃO RESOLVE — ela fica pendente até reconectar. Quem faz
 * `await setDoc(...)` seguido de `setSaving(false)` deixa o spinner girando
 * para sempre, e a pessoa acha que o app travou.
 *
 * Aqui a escrita é disparada sem await: com persistência local, o Firestore já
 * aplicou a mutação e o `onSnapshot` já emitiu o documento com
 * `hasPendingWrites`. A tela atualizou. O `.catch` só dispara quando o SERVIDOR
 * recusa — ou seja, quando as rules barram —, nunca por falta de rede.
 */
export function useCreateEntry() {
  const { spaceId, user } = useSession()
  const { data: space } = useSpace()

  return useMutation<{ id: EntryId }, Error, EntryInput>({
    mutationFn: async (input) => {
      if (!spaceId || !space || !user) {
        throw new Error('Sessão ou espaço ainda não carregados')
      }

      // A categoria vira documento na primeira vez que é usada. Fazer isso aqui,
      // e não na tela, garante que qualquer origem de gasto — sheet, atalho do
      // PWA, importação futura — deixe a referência válida.
      if (input.kind === 'expense' && input.categoryId !== null) {
        const category = DEFAULT_CATEGORIES.find(
          (item) => item.id === input.categoryId,
        )
        if (category) ensureCategory(spaceId, category)
      }

      const reference = doc(entriesCollection(spaceId))

      void setDoc(
        reference,
        entryPayload(
          input,
          space.config.cycleStart,
          user.uid,
          serverTimestamp(),
        ),
      ).catch((error: unknown) => {
        // Só chega aqui quando o servidor recusa: rules ou payload inválido.
        // Falta de rede não cai neste ramo — a escrita fica na fila.
        toast.error(errorMessage(error))
      })

      // O primeiro lançamento é metade do critério para oferecer a
      // instalação — marcado aqui porque é o ponto onde o usuário confiou um
      // dado real ao app. Ver `lib/engagement`.
      markFirstEntry()

      return { id: reference.id as EntryId }
    },

    // SEM invalidateQueries: o listener já ecoou a escrita de volta,
    // localmente, antes mesmo de ela chegar ao servidor. Invalidar aqui
    // gastaria uma leitura para receber o que já está na tela.
  })
}

/** Apagar é gesto comum num app de dinheiro; por isso é desfazível por toast. */
export function useDeleteEntry() {
  const { spaceId } = useSession()

  return useMutation<void, Error, EntryId>({
    mutationFn: async (id) => {
      if (!spaceId) throw new Error('Espaço não carregado')

      void deleteDoc(entryDoc(spaceId, id)).catch((error: unknown) => {
        toast.error(errorMessage(error))
      })
    },
  })
}
