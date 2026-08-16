'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ProviderButton } from '@/components/auth/provider-button'
import { FarolLockup } from '@/components/brand/farol-lockup'
import { activeProviders, type ProviderId } from '@/data/auth-providers'
import {
  consumeRedirectPending,
  errorMessage,
  LoginCancelled,
  signInWith,
} from '@/data/session'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useSession } from '@/providers/auth-provider'

/**
 * A tela de entrada, no formato que as pessoas já conhecem: painel de marca à
 * esquerda, autenticação à direita.
 *
 * A divisão não é enfeite — ela separa duas perguntas diferentes. A esquerda
 * responde "o que é isto e por que eu deveria entrar", e é a única chance de
 * responder isso para quem chegou por um link. A direita responde "como eu
 * entro", e precisa ser o mais curta e previsível possível.
 *
 * No celular o painel some por completo em vez de virar um cabeçalho gigante:
 * ali a pessoa quase sempre já conhece o app e só quer entrar, e empurrar o
 * botão para baixo da dobra seria cobrar de novo por uma decisão já tomada.
 */
export function SignInForm() {
  const router = useRouter()
  const { user, loading } = useSession()
  const online = useOnlineStatus()

  const [busy, setBusy] = useState<ProviderId | null>(null)
  const [error, setError] = useState<string | null>(null)

  /*
    Voltando do redirect, o SDK ainda leva um instante para resolver a sessão.
    Sem esta marca a tela renderiza ociosa nesse intervalo, e um formulário de
    login parado é indistinguível de um login que falhou.

    Inicializador lazy: a marca vale para uma volta só e é lida no primeiro
    render, antes de qualquer efeito.
  */
  const [returning] = useState(() =>
    typeof window === 'undefined' ? false : consumeRedirectPending(),
  )

  /*
    Sai daqui assim que EXISTE usuário — sem esperar o `loading` acabar.

    O `loading` segue verdadeiro enquanto o espaço financeiro é resolvido, e
    isso custa duas leituras sequenciais no Firestore. Esperar por ele prendia
    quem acabou de logar nesta tela durante todo esse tempo, diante de um
    formulário parado. Quem mostra a espera a partir daqui é o `SessionGate`,
    com o skeleton da tela real: esperar dentro do app é informação, esperar na
    tela de login é aparência de erro.
  */
  useEffect(() => {
    if (user) router.replace('/')
  }, [user, router])

  async function handleSignIn(id: ProviderId) {
    setBusy(id)
    setError(null)

    try {
      await signInWith(id)
    } catch (caught) {
      // Fechar o popup é desistência, não erro. Nada de tarja vermelha.
      if (!(caught instanceof LoginCancelled)) setError(errorMessage(caught))
    } finally {
      setBusy(null)
    }
  }

  const waiting = returning && loading && !user
  const blocked = busy !== null || waiting || !online

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <main className="flex items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-[22rem] flex-col gap-8">
          {/* No desktop a marca já domina o painel ao lado; repeti-la aqui
              seria redundância. No celular ela é a única âncora. */}
          <div className="flex justify-center lg:hidden">
            <FarolLockup size={38} orientation="stacked" />
          </div>

          <header className="flex flex-col gap-2 text-center lg:text-left">
            <h1 className="text-2xl font-semibold tracking-tight">
              Entrar no Farol
            </h1>
            <p className="text-muted-foreground text-sm text-balance">
              Sem senha para criar nem lembrar. Use a conta que você já tem.
            </p>
          </header>

          <div className="flex flex-col gap-3">
            {activeProviders().map((provider) => (
              <ProviderButton
                key={provider.id}
                provider={provider.id}
                label={waiting ? 'Entrando…' : provider.label}
                disabled={blocked}
                onClick={() => void handleSignIn(provider.id)}
              />
            ))}

            {error ? (
              <p
                role="alert"
                className="text-negative-soft-foreground bg-negative-soft rounded-md px-3 py-2 text-sm"
              >
                {error}
              </p>
            ) : null}

            {/* Entrar é a ÚNICA ação que realmente não funciona offline. Dizer
                isso vale mais do que deixar o botão falhar com erro de rede. */}
            {!online ? (
              <p className="text-muted-foreground text-center text-sm text-balance">
                Você está offline. Para entrar pela primeira vez é preciso
                conexão.
              </p>
            ) : null}
          </div>

          <p className="text-muted-foreground text-center text-xs text-balance lg:text-left">
            Ao entrar, seus dados ficam só com você. O Farol não compartilha
            nada com ninguém.
          </p>
        </div>
      </main>
    </div>
  )
}

/**
 * O painel de marca — a superfície `beacon`, verde-profunda nos DOIS temas.
 *
 * É a regra da marca: o farol brilha no escuro. Um painel que clareia junto
 * com o tema perderia exatamente a metáfora que dá nome ao produto.
 */
function BrandPanel() {
  return (
    <aside className="bg-beacon text-beacon-foreground relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
      <BeamLight />

      {/*
        A cascata entra de cima para baixo na ordem em que se lê: marca,
        promessa, provas, assinatura. Os quatro filhos diretos são exatamente
        os quatro passos — mexer na estrutura muda o ritmo, e é assim que deve
        ser: a animação segue o conteúdo, não uma contagem arbitrária.
      */}
      <div className="stagger-hero relative flex h-full flex-col justify-between gap-12">
        <FarolLockup size={34} tone="onDark" />

        <p className="max-w-sm text-3xl leading-[1.15] font-semibold tracking-tight text-balance">
          Descubra quanto você pode gastar até o fim do mês.
        </p>

        <ul className="flex max-w-sm flex-col gap-4">
          <Point title="Um número, não uma planilha">
            O Farol calcula o que sobra depois das contas e dos compromissos.
          </Point>
          <Point title="Conta com o que ainda vai entrar">
            Registrou um freela? Tudo se ajusta na hora, inclusive os
            percentuais.
          </Point>
          <Point title="Funciona sem internet">
            Lance na fila do mercado. Sincroniza sozinho quando o sinal voltar.
          </Point>
        </ul>

        <p className="text-beacon-muted text-sm">Clareza sobre o seu dinheiro.</p>
      </div>
    </aside>
  )
}

/**
 * A luz do farol varrendo o painel.
 *
 * São duas camadas com papéis distintos: um facho em gradiente cônico que gira
 * devagar — a varredura de um farol de verdade — e um halo que respira por
 * baixo, para que o canto nunca fique completamente apagado entre as passadas.
 *
 * Opacidade baixíssima e `blur` alto são o que separam "ambiente" de "objeto
 * girando". Se der para acompanhar o movimento com os olhos, está forte demais.
 *
 * Tudo é `aria-hidden`: é atmosfera, não informação. E quem pede menos
 * movimento recebe a versão parada, pelo corte global do `globals.css`.
 */
function BeamLight() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div
        className="animate-beam absolute -top-1/3 -left-1/4 size-[46rem] opacity-[0.10] blur-3xl"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, var(--brand-beam) 26deg, transparent 62deg, transparent 360deg)',
        }}
      />
      <div
        className="animate-glow absolute -top-40 -left-28 size-[26rem] rounded-full opacity-[0.14] blur-3xl"
        style={{ background: 'var(--brand-beam)' }}
      />
    </div>
  )
}

function Point({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-2 size-1.5 shrink-0 rounded-full"
        style={{ background: 'var(--brand-beam)' }}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-beacon-muted text-sm text-balance">
          {children}
        </span>
      </span>
    </li>
  )
}
