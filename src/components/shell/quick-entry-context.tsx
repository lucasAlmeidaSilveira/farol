'use client'

import { createContext, use } from 'react'

/**
 * Permite que qualquer parte da casca abra o lançamento rápido.
 *
 * Existe porque o gatilho muda de lugar conforme a largura: no desktop é um
 * botão na barra lateral, no celular é o botão flutuante. Os dois precisam
 * acionar o MESMO sheet — duplicar o estado criaria dois sheets capazes de
 * abrir ao mesmo tempo em telas intermediárias.
 */
export const QuickEntryContext = createContext<{ open: () => void }>({
  open: () => {},
})

export const useQuickEntry = () => use(QuickEntryContext)
