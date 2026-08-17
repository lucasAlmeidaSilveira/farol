'use client'

import { useState } from 'react'

import { Calendar } from '@/components/ui/calendar'
import { Chip } from '@/components/ui/chip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { addDays, type LocalDate } from '@/domain/period'
import { formatDate, formatShortDate, formatWeekday } from '@/lib/format'

/**
 * A data do lançamento.
 *
 * O caso comum — lancei agora, ou esqueci de ontem — continua a um toque, sem
 * abrir nada. O calendário existe para o resto, e só aparece para quem pedir:
 * num app cujo público desiste por atrito, obrigar todo lançamento a passar por
 * uma escolha de data cobraria de todo mundo o custo de um caso minoritário.
 *
 * Datas futuras ficam bloqueadas de propósito. Lançamento é registro do que já
 * aconteceu, e uma data futura jogaria o valor num período que ainda não abriu
 * — a pessoa lançaria o gasto e ele sumiria da tela.
 */

export type DateFieldProps = {
  value: LocalDate
  onChange: (value: LocalDate) => void
  today: LocalDate
}

export function DateField({ value, onChange, today }: DateFieldProps) {
  const [open, setOpen] = useState(false)

  const yesterday = addDays(today, -1)
  const isShortcut = value === today || value === yesterday

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip selected={value === today} onClick={() => onChange(today)}>
        hoje
      </Chip>

      <Chip selected={value === yesterday} onClick={() => onChange(yesterday)}>
        ontem
      </Chip>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {/*
            Aqui o chip não é um alternador: quem descreve o estado é o
            `aria-expanded` que o Radix injeta. `aria-pressed` junto diria que
            o botão está "ativado", o que não é o que abrir um calendário faz.
          */}
          <Chip
            selected={!isShortcut}
            aria-pressed={undefined}
            aria-label={
              isShortcut
                ? 'Escolher outro dia'
                : `Data do lançamento: ${formatDate(value)}. Escolher outro dia`
            }
          >
            <CalendarGlyph />
            <span aria-hidden="true">
              {isShortcut ? 'outro dia' : formatShortDate(value)}
            </span>
          </Chip>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto p-3">
          <Calendar
            value={value}
            highlight={today}
            max={today}
            onChange={(next) => {
              onChange(next)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      {/*
        A data escolhida por extenso, fora do chip.
        "15/08" cabe no chip mas não diz que dia da semana foi — e é o dia da
        semana que a pessoa lembra ao reconstituir um gasto.
      */}
      {!isShortcut ? (
        <span className="text-muted-foreground w-full text-xs">
          {formatWeekday(value)}, {formatDate(value)}
        </span>
      ) : null}
    </div>
  )
}

function CalendarGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="2"
        className="stroke-current"
        strokeWidth="1.5"
      />
      <path
        d="M2 6.5h12M5.5 2v2.5M10.5 2v2.5"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
