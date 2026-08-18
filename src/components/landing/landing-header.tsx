import Link from 'next/link'

import { FarolLockup } from '@/components/brand/farol-lockup'
import { CHROME, NAV_LINKS } from '@/content/landing'

import { EnterCta } from './enter-cta'

/**
 * A barra fixa da landing.
 *
 * Fica sempre visível porque a página é longa e a decisão de entrar pode
 * amadurecer em qualquer altura da rolagem — obrigar alguém a voltar ao topo
 * para agir é perder quem já estava convencido.
 *
 * Os links de âncora somem no celular, e não viram menu sanduíche: numa página
 * de uma coluna só, rolar É a navegação. Um menu ali seria um botão a mais
 * competindo com o único que importa.
 *
 * Sem estado de rolagem de propósito — a barra já nasce translúcida e com
 * borda. Um cabeçalho que muda de cara ao rolar exige JavaScript e listener de
 * scroll para ganhar 200ms de elegância que ninguém pediu.
 */
export function LandingHeader() {
  return (
    <header className="bg-background/85 border-border/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-6 lg:px-10">
        <Link href="/" aria-label="Farol — início" className="rounded-md">
          <FarolLockup size={26} />
        </Link>

        <nav aria-label={CHROME.navLabel} className="hidden gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground rounded-md text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Verde, não ouro: o ouro é a ação principal da página, e ela mora
            na dobra e no fechamento. Repeti-lo aqui o esvaziaria. */}
        <EnterCta label={CHROME.signIn} size="sm" />
      </div>
    </header>
  )
}
