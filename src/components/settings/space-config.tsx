'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { calendarPeriodOf, cycleFor, todayIn } from '@/domain/period'
import type { SpaceConfig } from '@/domain/types'
import { useEditSpaceConfig } from '@/hooks/space/use-edit-space'
import { formatDate } from '@/lib/format'

/**
 * As duas configurações que mudam o resultado do cálculo.
 *
 * Elas ficam aqui, e não no onboarding, de propósito: no primeiro minuto o
 * usuário não sabe responder "seu mês começa no dia 1?" — a pergunta só faz
 * sentido depois que ele viu o número e percebeu que o salário cai dia 5.
 */

export function CycleCard({ config }: { config: SpaceConfig }) {
  const edit = useEditSpaceConfig()
  const [text, setText] = useState(String(config.cycleStart.day))

  const day = Number(text)
  const valid = Number.isInteger(day) && day >= 1 && day <= 31
  const dirty = valid && day !== config.cycleStart.day

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cycle-day">Meu mês começa no dia</Label>
          <div className="flex items-center gap-2">
            <Input
              id="cycle-day"
              inputMode="numeric"
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 2))}
              aria-invalid={!valid}
              className="h-12 w-20 text-center text-base"
            />
            <Button
              disabled={!dirty || edit.isPending}
              onClick={() => {
                edit.mutate({ cycleStart: { type: 'dayOfMonth', day } })
              }}
            >
              Salvar
            </Button>
          </div>
        </div>

        {valid ? (
          <CyclePreview day={day} />
        ) : (
          <p className="text-negative text-sm">Use um dia entre 1 e 31.</p>
        )}

        {/* O aviso é obrigatório: sem ele, quem troca o ciclo olha para agosto,
            vê tudo igual e conclui que o app ignorou a mudança. */}
        <p className="text-muted-foreground text-xs text-balance">
          Vale para lançamentos novos. Os meses já registrados continuam como
          estão — o Farol não reescreve o passado.
        </p>
      </CardContent>
    </Card>
  )
}

function CyclePreview({ day }: { day: number }) {
  const month = calendarPeriodOf(todayIn('America/Sao_Paulo'))
  const cycle = cycleFor(month, { type: 'dayOfMonth', day })

  return (
    <p className="text-muted-foreground text-sm">
      Este mês vai de{' '}
      <span className="text-foreground font-medium">
        {formatDate(cycle.start)}
      </span>{' '}
      a{' '}
      <span className="text-foreground font-medium">
        {formatDate(cycle.end)}
      </span>
      .
    </p>
  )
}

const POLICY_COPY = {
  confirmedOnly:
    'Freelas entram na conta quando você registra o recebimento. O número começa menor e sobe conforme o dinheiro chega.',
  includeForecast:
    'Freelas entram já na previsão. O número começa maior, mas conta com dinheiro que ainda não chegou.',
} as const

export function IncomePolicyCard({ config }: { config: SpaceConfig }) {
  const edit = useEditSpaceConfig()
  const policy = config.variableIncomePolicy

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <Tabs
          value={policy}
          onValueChange={(next: string) => {
            if (next !== policy) {
              edit.mutate({
                variableIncomePolicy:
                  next as SpaceConfig['variableIncomePolicy'],
              })
            }
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="confirmedOnly">Só o que entrou</TabsTrigger>
            <TabsTrigger value="includeForecast">Incluir previsto</TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-muted-foreground text-sm text-balance">
          {POLICY_COPY[policy]}
        </p>
      </CardContent>
    </Card>
  )
}
