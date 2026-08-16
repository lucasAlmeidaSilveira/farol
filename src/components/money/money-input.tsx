'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { type Cents, formatBRL, parseBRL, ZERO } from '@/domain/money'
import { cn } from '@/lib/utils'

/**
 * Campo de dinheiro.
 *
 * Mantém um rascunho em texto enquanto a pessoa digita e só emite quando o
 * valor é interpretável. Isso resolve o problema clássico de campo monetário
 * controlado: reformatar a cada tecla joga o cursor para o fim e impede apagar
 * a vírgula, porque o texto é reescrito embaixo de quem está digitando.
 *
 * A reformatação acontece no blur — quando a pessoa terminou de dizer o que
 * queria dizer.
 */

export type MoneyInputProps = {
  value: Cents
  onChange: (value: Cents) => void
  'aria-label'?: string
  id?: string
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export function MoneyInput({
  value,
  onChange,
  placeholder = '0,00',
  autoFocus = false,
  id,
  className,
  ...aria
}: MoneyInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <Input
      id={id}
      aria-label={aria['aria-label']}
      // `decimal` abre o teclado numérico do celular sem travar a vírgula.
      inputMode="decimal"
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={draft ?? (value === ZERO ? '' : formatBRL(value))}
      onFocus={() => setDraft(value === ZERO ? '' : centsToDraft(value))}
      onChange={(event) => {
        const next = event.target.value
        setDraft(next)

        const parsed = parseBRL(next)
        if (parsed !== null) onChange(parsed)
        else if (next.trim() === '') onChange(ZERO)
      }}
      onBlur={() => setDraft(null)}
      // `text-base` fixo: abaixo de 16px o Safari dá zoom ao focar, e o
      // layout salta bem no meio da digitação de um valor.
      className={cn('money h-12 text-base', className)}
    />
  )
}

/** Texto editável a partir do valor: sem "R$" e sem separador de milhar. */
function centsToDraft(value: Cents): string {
  const absolute = Math.abs(value)
  const reais = Math.floor(absolute / 100)
  const cents = String(absolute % 100).padStart(2, '0')
  return `${value < 0 ? '-' : ''}${reais},${cents}`
}
