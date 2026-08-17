'use client'

import type { EditScope } from '@/hooks/plan/use-edit-plan'
import { cn } from '@/lib/utils'

/**
 * "Vale a partir de quando?" — a pergunta que preserva o histórico.
 *
 * Ela é feita em linguagem natural, e não como um seletor técnico de datas,
 * porque a consequência é que importa: "deste mês em diante" nunca reescreve
 * meses já vividos.
 *
 * O texto muda entre criar e editar — criando, não existe "novo valor", existe
 * uma conta nova — mas o controle é o mesmo, para a mesma decisão não ter duas
 * aparências no mesmo app.
 */

export type ScopeFieldProps = {
  value: EditScope
  onChange: (value: EditScope) => void
  legend: string
  fromNowOn: { label: string; hint: string }
  thisMonth: { label: string; hint: string }
  /** Ressalva mostrada só quando "só neste mês" está escolhido. */
  children?: React.ReactNode
}

export function ScopeField({
  value,
  onChange,
  legend,
  fromNowOn,
  thisMonth,
  children,
}: ScopeFieldProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-muted-foreground pb-2 text-sm">{legend}</legend>

      <Option
        active={value === 'fromNowOn'}
        onClick={() => onChange('fromNowOn')}
        {...fromNowOn}
      />
      <Option
        active={value === 'thisMonth'}
        onClick={() => onChange('thisMonth')}
        {...thisMonth}
      />

      {value === 'thisMonth' ? children : null}
    </fieldset>
  )
}

function Option({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'focus-visible:ring-ring flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors duration-150 outline-none focus-visible:ring-[3px]',
        active ? 'border-accent-border bg-accent/10' : 'border-input',
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground text-sm">{hint}</span>
    </button>
  )
}
