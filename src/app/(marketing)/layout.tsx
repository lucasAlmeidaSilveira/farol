import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingHeader } from '@/components/landing/landing-header'
import { ScrollProgress } from '@/components/landing/motion'

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
 * O provider de movimento NÃO fica aqui: ele embrulha o app inteiro, em
 * `providers.tsx`. A landing usa as mesmas peças de animação que o produto —
 * só com a régua longa (`variant="reveal"`), porque aqui ninguém tem tarefa
 * pendente.
 */
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
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <ScrollProgress />

      <LandingHeader />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  )
}
