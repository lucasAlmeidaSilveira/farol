'use client'

import Link from 'next/link'

import { FarolLockup } from '@/components/brand/farol-lockup'
import { AccountMenu } from '@/components/shared/account-menu'
import { cn } from '@/lib/utils'

/**
 * O cabeçalho de cada tela.
 *
 * A marca só aparece abaixo de `lg`: no desktop ela já está na barra lateral, e
 * repetir logotipo na mesma tela é ruído que rouba espaço do conteúdo.
 *
 * O avatar acompanha a marca pela mesma razão invertida: no celular não existe
 * barra lateral, então sem ele a conta não teria nenhum ponto de acesso — que
 * era o caso de sair, alcançável só no fim de Ajustes.
 */
export function PageHeader({
  title,
  hint,
  aside,
  className,
}: {
  title: string
  hint?: string
  aside?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        {/*
          A marca leva para o início, como em qualquer app.

          Não era link, e na barra lateral era — o que deixava a home
          inalcançável justamente no estado sem plano, onde a navegação inteira
          não é montada e esta é a única marca na tela.
        */}
        <Link href="/hoje" aria-label="Farol — início" className="shrink-0">
          <FarolLockup size={26} />
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          {aside}
          <AccountMenu compact />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold lg:text-3xl">{title}</h1>
          {hint ? (
            <p className="text-muted-foreground text-sm">{hint}</p>
          ) : null}
        </div>
        <div className="hidden lg:block">{aside}</div>
      </div>
    </header>
  )
}

/** Container padrão das telas: largura confortável no desktop, folga no mobile. */
export function PageContainer({
  children,
  className,
  wide = false,
}: {
  children: React.ReactNode
  className?: string
  /** `wide` para telas que se beneficiam de duas colunas largas. */
  wide?: boolean
}) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-col gap-6 px-5 py-6',
        // Espaço para a barra inferior e o botão flutuante; no desktop some.
        'pb-32 lg:pb-10',
        'sm:px-6 lg:px-10 lg:py-9',
        wide ? 'max-w-6xl' : 'max-w-5xl',
        className,
      )}
    >
      {children}
    </main>
  )
}
