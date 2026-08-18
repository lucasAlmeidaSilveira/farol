import Link from 'next/link'

import { FarolLockup } from '@/components/brand/farol-lockup'
import { CHROME, FOOTER_TAGLINE, NAV_LINKS } from '@/content/landing'

/**
 * O rodapé, curto por decisão.
 *
 * Rodapé de landing não é mapa do site: quem chegou até aqui rolando ou não se
 * convenceu — e aí o que resolve é a última chamada logo acima, não uma grade
 * de links — ou já clicou. Sem ano no aviso de direitos, porque a página é
 * gerada no build e um ano congelado é o sinal mais barato de site
 * abandonado.
 */
export function LandingFooter() {
  return (
    <footer className="border-border/60 border-t py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <FarolLockup size={24} />
            <p className="text-muted-foreground text-sm">{FOOTER_TAGLINE}</p>
          </div>

          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/entrar"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {CHROME.signIn}
            </Link>
          </nav>
        </div>

        <p className="text-muted-foreground text-xs">{CHROME.rights}</p>
      </div>
    </footer>
  )
}
