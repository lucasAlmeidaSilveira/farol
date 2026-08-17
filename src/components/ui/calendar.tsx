'use client'

import { useEffect, useRef, useState } from 'react'

import {
  addDays,
  addMonths,
  calendarPeriodOf,
  lastDayOfMonth,
  type LocalDate,
  localDate,
  type Period,
  weekdayOf,
  yearMonth,
} from '@/domain/period'
import {
  formatDate,
  formatPeriod,
  formatWeekday,
  WEEKDAY_NAMES,
} from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Calendário mensal escrito à mão, sobre `LocalDate`.
 *
 * Não usa `Date` em lugar nenhum da lógica: o app inteiro trata data como civil
 * ('YYYY-MM-DD'), e um calendário que voltasse a `Date` reintroduziria
 * exatamente o bug de fuso que o domínio existe para eliminar — o dia 1º
 * aparecendo na coluna errada para quem está em UTC−3.
 *
 * É uma `<table>` de verdade, e não uma grade de `div`s com `role`: leitor de
 * tela já sabe navegar tabela, e o cabeçalho de coluna dá o dia da semana sem
 * nenhum atributo extra.
 */

/** Iniciais como se escreve em calendário brasileiro, domingo primeiro. */
const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const

export type CalendarProps = {
  value: LocalDate
  onChange: (value: LocalDate) => void
  /** Datas depois desta ficam desabilitadas. */
  max?: LocalDate
  /** Datas antes desta ficam desabilitadas. */
  min?: LocalDate
  /** Ganha um anel discreto. Normalmente "hoje". */
  highlight?: LocalDate
  className?: string
}

export function Calendar({
  value,
  onChange,
  max,
  min,
  highlight,
  className,
}: CalendarProps) {
  const [visible, setVisible] = useState<Period>(() => calendarPeriodOf(value))

  /*
    Tabindex móvel: uma única célula é alcançável por Tab, e as setas movem
    dentro da grade. É o que a prática de acessibilidade pede para grade de
    calendário — 31 paradas de Tab seria pior do que não ter navegação.
  */
  const [focused, setFocused] = useState<LocalDate>(value)
  const gridRef = useRef<HTMLTableSectionElement>(null)
  const shouldFocus = useRef(false)

  useEffect(() => {
    if (!shouldFocus.current) return
    shouldFocus.current = false

    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)
      ?.focus()
  }, [focused])

  const isBlocked = (date: LocalDate) =>
    (max !== undefined && date > max) || (min !== undefined && date < min)

  function moveTo(date: LocalDate) {
    if (isBlocked(date)) return
    shouldFocus.current = true
    setFocused(date)
    setVisible(calendarPeriodOf(date))
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const step: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }

    const days = step[event.key]
    if (days !== undefined) {
      event.preventDefault()
      moveTo(addDays(focused, days))
      return
    }

    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      const next = addMonths(visible, event.key === 'PageUp' ? -1 : 1)
      moveTo(clampToMonth(focused, next))
    }
  }

  function shiftMonth(by: number) {
    const next = addMonths(visible, by)
    setVisible(next)
    // O foco acompanha o mês visível, senão a seta seguinte saltaria de volta.
    setFocused(clampToMonth(focused, next))
  }

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <MonthButton label="Mês anterior" onClick={() => shiftMonth(-1)}>
          ‹
        </MonthButton>

        <span aria-live="polite" className="text-sm font-medium capitalize">
          {formatPeriod(visible)}
        </span>

        <MonthButton label="Próximo mês" onClick={() => shiftMonth(1)}>
          ›
        </MonthButton>
      </div>

      <table className="w-full border-separate border-spacing-0.5">
        <thead>
          <tr>
            {WEEKDAY_INITIALS.map((initial, index) => (
              <th
                key={index}
                scope="col"
                className="text-muted-foreground pb-1 text-xs font-normal"
              >
                <span aria-hidden="true">{initial}</span>
                <span className="sr-only">{WEEKDAY_NAMES[index]}</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody ref={gridRef} onKeyDown={onKeyDown}>
          {weeksOf(visible).map((week, index) => (
            <tr key={index}>
              {week.map((date, column) =>
                date === null ? (
                  <td key={column} />
                ) : (
                  <td key={column} className="p-0 text-center">
                    <DayCell
                      date={date}
                      selected={date === value}
                      highlighted={date === highlight}
                      disabled={isBlocked(date)}
                      tabbable={date === focused}
                      onSelect={() => {
                        setFocused(date)
                        onChange(date)
                      }}
                    />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'hover:bg-muted flex size-11 shrink-0 items-center justify-center rounded-lg text-lg transition-all',
        'focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.98]',
      )}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}

function DayCell({
  date,
  selected,
  highlighted,
  disabled,
  tabbable,
  onSelect,
}: {
  date: LocalDate
  selected: boolean
  highlighted: boolean
  disabled: boolean
  tabbable: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      data-date={date}
      disabled={disabled}
      tabIndex={tabbable ? 0 : -1}
      aria-pressed={selected}
      aria-label={`${formatWeekday(date)}, ${formatDate(date)}`}
      onClick={onSelect}
      className={cn(
        'flex size-11 items-center justify-center rounded-lg text-sm transition-all',
        'focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.98]',
        selected
          ? 'bg-primary text-primary-foreground font-semibold'
          : 'hover:bg-muted',
        // O anel de "hoje" só aparece quando hoje NÃO é o dia escolhido: os dois
        // juntos competiriam, e o que importa saber é qual dia está selecionado.
        highlighted && !selected && 'ring-border ring-1',
      )}
    >
      {Number(date.slice(8, 10))}
    </button>
  )
}

// ---------------------------------------------------------------- helpers

/**
 * As semanas do mês, alinhadas em domingo. As posições antes do dia 1º e depois
 * do último vêm como `null` — células vazias, e não os dias do mês vizinho:
 * num seletor de lançamento, um "31" cinza de outro mês é convite a erro.
 */
function weeksOf(value: Period): (LocalDate | null)[][] {
  const { year, month } = yearMonth(value)
  const total = lastDayOfMonth(year, month)
  const lead = weekdayOf(localDate(`${value}-01`))

  const cells: (LocalDate | null)[] = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= total; day += 1) {
    cells.push(localDate(`${value}-${String(day).padStart(2, '0')}`))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  )
}

/** O mesmo dia no mês alvo, limitado ao último dia dele (31 → 30 → 28). */
function clampToMonth(date: LocalDate, target: Period): LocalDate {
  const { year, month } = yearMonth(target)
  const day = Math.min(Number(date.slice(8, 10)), lastDayOfMonth(year, month))
  return localDate(`${target}-${String(day).padStart(2, '0')}`)
}
