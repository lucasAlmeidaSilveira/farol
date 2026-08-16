import {
  type AuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth'

/**
 * Registry de provedores de login.
 *
 * A Apple já está aqui, desligada por env var. Isso não é indecisão: o Apple
 * Sign In na web exige um domínio público verificado (a Apple hospeda um
 * arquivo de associação e valida por HTTPS), o que é impossível antes de o app
 * estar publicado. Deixá-la registrada e desligada faz a Fase 2 ser um flip de
 * variável, sem tocar em código.
 *
 * Adicionar Microsoft ou GitHub depois é uma entrada nova neste objeto — nenhum
 * componente de UI muda, porque a tela de login itera `activeProviders()`.
 */

export type ProviderId = 'google' | 'apple'

export type ProviderDefinition = {
  id: ProviderId
  label: string
  enabled: boolean
  create: () => AuthProvider
}

const REGISTRY: Record<ProviderId, ProviderDefinition> = {
  google: {
    id: 'google',
    label: 'Continuar com o Google',
    enabled: true,
    create: () => {
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      // Força o seletor de conta: evita o clássico "logou sozinho na conta
      // errada" de quem tem Google pessoal e de trabalho no mesmo navegador.
      provider.setCustomParameters({ prompt: 'select_account' })
      return provider
    },
  },

  apple: {
    id: 'apple',
    label: 'Continuar com a Apple',
    enabled: process.env.NEXT_PUBLIC_APPLE_ENABLED === 'true',
    create: () => {
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      // Sem este escopo o nome NUNCA chega — nem na primeira autorização, que
      // é a única vez em que a Apple o envia.
      provider.addScope('name')
      provider.setCustomParameters({ locale: 'pt_BR' })
      return provider
    },
  },
}

export const activeProviders = (): ProviderDefinition[] =>
  Object.values(REGISTRY).filter((provider) => provider.enabled)

export const getProvider = (id: ProviderId): ProviderDefinition => REGISTRY[id]
