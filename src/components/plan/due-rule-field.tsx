'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { nthBusinessDay } from '@/domain/business-days'
import { calendarPeriodOf, todayIn } from '@/domain/period'
import type { DueRule } from '@/domain/types'
import { formatDate } from '@/lib/format'

/**
 * O campo de vencimento, com as duas formas que existem na vida real.
 *
 * "Dia útil" não é firula: compromissos mensais e folha de pagamento usam essa
 * convenção, e ela produz uma data DIFERENTE de "dia N" quase todo mês. O
 * quinto dia útil de agosto de 2026 é dia 7, porque o mês começa num sábado.
 *
 * A prévia embaixo do campo existe para tornar isso concreto — dizer "5º dia
 * útil" é abstrato; mostrar "neste mês cai em 7 de agosto" é verificável.
 */

export type DueRuleValue = {
  kind: 'none' | 'dayOfMonth' | 'businessDay'
  /** Texto cru do campo, para não brigar com o cursor enquanto se digita. */
  text: string
}

export const emptyDueRule: DueRuleValue = { kind: 'none', text: '' }

export function toDueRule(value: DueRuleValue): DueRule | null {
  const number = Number(value.text)
  if (value.text === '' || !Number.isInteger(number)) return null
  if (value.kind === 'dayOfMonth') return { type: 'dayOfMonth', day: number }
  if (value.kind === 'businessDay') return { type: 'businessDay', n: number }
  return null
}

export function fromDueRule(rule: DueRule | null): DueRuleValue {
  if (rule === null) return emptyDueRule
  return rule.type === 'dayOfMonth'
    ? { kind: 'dayOfMonth', text: String(rule.day) }
    : { kind: 'businessDay', text: String(rule.n) }
}

export function isValidDueRule(value: DueRuleValue): boolean {
  if (value.kind === 'none' || value.text === '') return true
  const number = Number(value.text)
  if (!Number.isInteger(number)) return false
  return value.kind === 'dayOfMonth'
    ? number >= 1 && number <= 31
    : number >= 1 && number <= 23
}

export function DueRuleField({
  value,
  onChange,
  label = 'Vencimento',
}: {
  value: DueRuleValue
  onChange: (value: DueRuleValue) => void
  label?: string
}) {
  const valid = isValidDueRule(value)
  const rule = toDueRule(value)

  return (
    <div className="flex flex-col gap-3">
      <Label>
        {label}{' '}
        <span className="text-muted-foreground font-normal">(opcional)</span>
      </Label>

      <Tabs
        value={value.kind}
        onValueChange={(next: string) =>
          onChange({
            kind: next as DueRuleValue['kind'],
            text: next === 'none' ? '' : value.text,
          })
        }
      >
        <TabsList className="w-full">
          <TabsTrigger value="none">Sem data</TabsTrigger>
          <TabsTrigger value="dayOfMonth">Dia do mês</TabsTrigger>
          <TabsTrigger value="businessDay">Dia útil</TabsTrigger>
        </TabsList>
      </Tabs>

      {value.kind !== 'none' ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              value={value.text}
              onChange={(event) =>
                onChange({ ...value, text: event.target.value.slice(0, 2) })
              }
              placeholder={value.kind === 'dayOfMonth' ? '10' : '5'}
              aria-label={
                value.kind === 'dayOfMonth'
                  ? 'Dia do mês'
                  : 'Número do dia útil'
              }
              aria-invalid={!valid}
              className="h-12 w-20 text-center text-base"
            />
            <span className="text-muted-foreground text-sm">
              {value.kind === 'dayOfMonth' ? 'de cada mês' : 'º dia útil'}
            </span>
          </div>

          {valid ? (
            <DuePreview rule={rule} />
          ) : (
            <p className="text-negative text-sm">
              {value.kind === 'dayOfMonth'
                ? 'Use um dia entre 1 e 31.'
                : 'Use um número entre 1 e 23 — nenhum mês tem mais dias úteis.'}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** Torna a regra concreta: mostra em que dia ela cai NESTE mês. */
function DuePreview({ rule }: { rule: DueRule | null }) {
  if (rule === null) return null

  const today = todayIn('America/Sao_Paulo')
  const month = calendarPeriodOf(today)

  if (rule.type === 'dayOfMonth') {
    return (
      <p className="text-muted-foreground text-xs">
        Aparece como lembrete na tela inicial, ordenado por data.
      </p>
    )
  }

  return (
    <p className="text-muted-foreground text-xs text-balance">
      Neste mês cai em{' '}
      <span className="text-foreground font-medium">
        {formatDate(nthBusinessDay(month, rule.n))}
      </span>
      . A conta pula fins de semana e feriados nacionais — feriados municipais
      não entram, então a data pode andar um dia na sua cidade.
    </p>
  )
}
