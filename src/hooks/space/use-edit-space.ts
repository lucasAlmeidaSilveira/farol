'use client'

import { useMutation } from '@tanstack/react-query'
import { serverTimestamp, updateDoc } from 'firebase/firestore'
import { toast } from 'sonner'

import { spaceDoc } from '@/data/paths'
import { errorMessage } from '@/data/session'
import type { SpaceConfig } from '@/domain/types'
import { useSession } from '@/providers/auth-provider'

/**
 * Edição da configuração do espaço.
 *
 * As duas opções desta tela têm efeitos MUITO diferentes no tempo, e a UI
 * precisa dizer isso:
 *
 * - `variableIncomePolicy` muda o resultado na hora, inclusive de meses já
 *   passados, porque a engine recalcula tudo a cada leitura.
 *
 * - `cycleStart` só vale para lançamentos NOVOS. O `period` é gravado em cada
 *   lançamento, não derivado da data — se fosse derivado, mexer no ciclo
 *   reclassificaria todo o passado em silêncio, e o histórico deixaria de ser
 *   confiável. O preço dessa escolha é que a mudança não é retroativa.
 */
export function useEditSpaceConfig() {
  const { spaceId } = useSession()

  return useMutation<void, Error, Partial<SpaceConfig>>({
    mutationFn: async (patch) => {
      if (!spaceId) throw new Error('Espaço não carregado')

      try {
        // Notação de ponto, não `{ config: patch }`: gravar o mapa inteiro
        // apagaria as chaves ausentes do patch. As rules continuam válidas
        // porque enxergam o documento já mesclado, com as quatro chaves.
        await updateDoc(spaceDoc(spaceId), {
          ...Object.fromEntries(
            Object.entries(patch).map(([key, value]) => [
              `config.${key}`,
              value,
            ]),
          ),
          updatedAt: serverTimestamp(),
        })
      } catch (error) {
        toast.error(errorMessage(error))
        throw error
      }
    },
  })
}
