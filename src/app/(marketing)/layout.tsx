import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingHeader } from '@/components/landing/landing-header'
import { LandingMotion, ScrollProgress } from '@/components/landing/motion'

/**
 * A casca da parte pública do site.
 *
 * Não é a casca do app: aqui não existe `SessionGate`, navegação lateral nem
 * entrada rápida. A página inicial precisa abrir para quem nunca entrou, sem
 * esperar o Firebase resolver sessão nenhuma — qualquer bloqueio aqui é tempo
 * cobrado de quem ainda está decidindo.
 *
 * Existe como layout, e não direto na página, porque as próximas páginas
 * públicas (privacidade, termos) vão querer exatamente o mesmo cabeçalho e
 * rodapé.
 *
 * O `LandingMotion` fica aqui, na raiz da parte pública, por dois motivos: o
 * `LazyMotion` carrega o subconjunto de animação UMA vez para a página inteira,
 * e o `reducedMotion` passa a valer para toda peça animada abaixo — inclusive
 * as que ainda vamos escrever.
 */
const NOSCRIPT_REVEAL = `[data-reveal]{opacity:1!important;filter:none!important;transform:none!important}`

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /*
      `overflow-x-clip` é cinto e suspensório: os halos decorativos da página
      são absolutos e grandes, e basta um deles escapar do contêiner para a
      página inteira ganhar rolagem lateral no celular — o defeito mais comum
      de landing e o mais difícil de perceber no desktop.
    */
    <LandingMotion>
      {/*
        O seguro contra a página em branco.

        O Motion escreve o estado inicial da animação já no HTML do servidor —
        `opacity: 0` incluso. Se o JavaScript não carregar, nada apareceria, e
        uma landing invisível é pior que uma landing sem animação nenhuma. Esta
        regra devolve todo elemento animado ao estado final, e só é aplicada
        exatamente no cenário em que ninguém mais pode fazer isso.
      */}
      <noscript>
        <style>{NOSCRIPT_REVEAL}</style>
      </noscript>

      <div className="flex min-h-dvh flex-col overflow-x-clip">
        <ScrollProgress />

        <LandingHeader />
        <main className="flex-1">{children}</main>
        <LandingFooter />
      </div>
    </LandingMotion>
  )
}
