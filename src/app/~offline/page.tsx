import type { Metadata } from 'next'

import { FarolMark } from '@/components/brand/farol-mark'

export const metadata: Metadata = {
  title: 'Sem conexão',
}

/**
 * A página que aparece quando o app é aberto sem rede E sem shell em cache.
 *
 * É o farol APAGADO — o único uso legítimo desse estado, previsto na marca para
 * erro e vazio. Ela não pode importar nada de Firebase nem de contexto: é
 * pré-cacheada e precisa renderizar sozinha, sem rede e sem sessão.
 *
 * O tom segue o resto do app: informa, não repreende. Ficar sem sinal não é
 * erro do usuário, e "Sem conexão" já diz tudo o que ele precisa saber.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <FarolMark size={72} lit={false} withHorizon title="Farol apagado" />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sem conexão</h1>
        <p className="text-muted-foreground max-w-xs text-balance">
          Assim que a internet voltar, seu número aparece aqui de novo — com
          tudo que você lançou enquanto esteve offline.
        </p>
      </div>
    </main>
  )
}
