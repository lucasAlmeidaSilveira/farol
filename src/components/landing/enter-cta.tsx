'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { RETURNING_CTA } from '@/content/landing'
import { useSession } from '@/providers/auth-provider'

/**
 * O ÚNICO botão de ação da landing — repetido, nunca concorrido.
 *
 * Toda seção termina no mesmo destino. Oferecer uma segunda ação de peso
 * ("criar conta" ao lado de "entrar", "ver planos", "baixar") divide a decisão
 * e a página deixa de ter uma resposta óbvia. Aqui só existe uma.
 *
 * Para quem já tem sessão, o rótulo vira "Abrir o Farol" e o destino é a tela
 * Hoje: mandar de volta ao login quem já entrou é o tipo de detalhe que faz o
 * produto parecer desatento. Antes de o Firebase resolver a sessão, mostramos
 * a versão de visitante — é o caso mais comum nesta página, e trocar o rótulo
 * depois é menos ruim que segurar o botão num estado de carregamento.
 */
export function EnterCta({
  label,
  ...props
}: { label: string } & Omit<ComponentProps<typeof Button>, 'asChild'>) {
  const { user } = useSession()

  const href = user ? RETURNING_CTA.href : '/entrar'
  const text = user ? RETURNING_CTA.label : label

  return (
    <Button asChild {...props}>
      <Link href={href}>{text}</Link>
    </Button>
  )
}
