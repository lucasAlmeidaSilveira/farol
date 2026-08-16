import {
  browserLocalPersistence,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type UserCredential,
} from 'firebase/auth'

import { getProvider, type ProviderId } from './auth-providers'
import { auth } from './firebase'
import { releaseAllSubscriptions } from './subscription'

/**
 * Entrada e saída da sessão.
 *
 * POPUP, com fallback automático para redirect. A escolha é técnica, não
 * estética: desde o SDK v9.15, `signInWithRedirect` quebra em navegadores que
 * bloqueiam storage de terceiros — Safari/iOS com ITP, Firefox com Total Cookie
 * Protection, Chrome com storage particionado. O handler de redirect vive em
 * outro domínio, e o estado salvo lá fica inacessível na volta. O sintoma é
 * brutal: a pessoa loga, volta para o app e continua deslogada, em loop.
 *
 * O popup mantém a `window.opener` na mesma origem e não depende de storage
 * particionado. Ele pode ser bloqueado — e é para isso que existe o fallback.
 */

const RETRY_WITH_REDIRECT = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
])

/** A pessoa só desistiu. Não é erro, não merece toast vermelho. */
const USER_GAVE_UP = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
])

export class LoginCancelled extends Error {
  constructor() {
    super('Login cancelado pelo usuário')
    this.name = 'LoginCancelled'
  }
}

export async function signInWith(
  id: ProviderId,
): Promise<UserCredential | null> {
  const provider = getProvider(id).create()
  await setPersistence(auth, browserLocalPersistence)

  try {
    // IMPORTANTE: nada de await pesado entre o clique e o signInWithPopup,
    // senão o navegador perde o "user gesture" e bloqueia o popup.
    return await signInWithPopup(auth, provider)
  } catch (error) {
    const code = (error as { code?: string }).code ?? ''

    if (USER_GAVE_UP.has(code)) throw new LoginCancelled()

    if (RETRY_WITH_REDIRECT.has(code)) {
      // Não retorna: a página navega para fora.
      await signInWithRedirect(auth, provider)
      return null
    }

    throw error
  }
}

/** Fecha o ciclo caso tenhamos caído no fallback de redirect. */
export const completeRedirect = () => getRedirectResult(auth)

export async function signOutOfFarol() {
  // Fecha os listeners ANTES de derrubar a sessão: um listener vivo com o token
  // revogado emite permission-denied e polui a tela na saída.
  releaseAllSubscriptions()
  await signOut(auth)
}

const MESSAGES: Record<string, string> = {
  'auth/account-exists-with-different-credential':
    'Já existe uma conta com este e-mail usando outro método de login.',
  'auth/unauthorized-domain': 'Este domínio não está autorizado para login.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
  'auth/too-many-requests': 'Muitas tentativas. Espere um instante.',
  'auth/popup-blocked': 'O navegador bloqueou a janela de login.',
  'permission-denied': 'Você não tem acesso a esses dados.',
  unavailable: 'Sem conexão. Vou tentar de novo sozinho.',
}

/** Traduz o erro do Firebase para o vocabulário do usuário, não do SDK. */
export function errorMessage(error: unknown): string {
  const code = (error as { code?: string }).code ?? ''
  return MESSAGES[code] ?? 'Não foi possível concluir. Tente de novo.'
}
