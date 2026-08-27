import { MoneyValue } from '@/components/money/money-value'
import type { Cents } from '@/domain/money'
import type { Pace } from '@/engine'
import { cn } from '@/lib/utils'

/**
 * O ritmo do mês — a resposta para "e se eu continuar assim?".
 *
 * A engine já calculava tudo isto: quanto do mês passou, quanto você tem
 * gastado por dia, onde o mês fecha nesse ritmo e se isso estoura o plano. A
 * tela usava um único desses números, numa linha de 12px embaixo do valor
 * principal, e jogava o resto fora. Este card é a diferença entre um app que
 * mostra um saldo e um app que avisa a tempo.
 *
 * A leitura inteira está numa comparação só: **a barra do gasto contra a marca
 * do dia de hoje**. Se o preenchimento passou da marca, você está gastando mais
 * rápido do que o mês anda — e isso se entende sem ler número nenhum, que é o
 * ponto para quem abre o app no meio da rua.
 *
 * Terracota entra em `ahead` e `over` porque ali existe algo a fazer. É atenção,
 * nunca punição: as duas frases terminam dizendo que dá para ajustar, e nenhuma
 * usa a palavra "você gastou demais". O público-alvo já se sente mal com
 * dinheiro; um app que confirma isso é um app que se desinstala.
 */

export type PaceCardProps = {
  pace: Pace
  /** O teto do mês: renda considerada menos compromissos. */
  availableCents: Cents
  /** O que já saiu em gasto livre. */
  spentCents: Cents
  className?: string
}

export function PaceCard({
  pace,
  availableCents,
  spentCents,
  className,
}: PaceCardProps) {
  const warning = pace.status === 'ahead' || pace.status === 'over'

  // Sem teto não há régua: um mês sem renda cadastrada mostraria uma barra
  // dividida por zero, e uma barra sem escala mente mais do que informa.
  const hasScale = availableCents > 0

  const spentPct = hasScale
    ? Math.min(100, Math.round((spentCents / availableCents) * 100))
    : 0
  const monthPct =
    pace.totalDays > 0
      ? Math.min(100, Math.round((pace.elapsedDays / pace.totalDays) * 100))
      : 0

  return (
    <section
      className={cn(
        'bg-card border-border flex flex-col gap-4 rounded-lg border p-4',
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-eyebrow text-muted-foreground uppercase">
          Ritmo do mês
        </h3>
        <span className="text-muted-foreground text-sm">
          dia {pace.elapsedDays} de {pace.totalDays}
        </span>
      </header>

      {hasScale ? (
        <div className="flex flex-col gap-2">
          <PaceBar spentPct={spentPct} monthPct={monthPct} warning={warning} />

          {/* Sem esta legenda, o traço no meio da barra é um risco sem nome —
              e marca que não se explica vira sujeira, não informação. */}
          <p
            aria-hidden="true"
            className="text-muted-foreground flex items-center gap-3 text-xs"
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  'h-1.5 w-3 rounded-full',
                  warning ? 'bg-negative' : 'bg-positive',
                )}
              />
              gasto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-foreground h-3 w-0.5 rounded-full" />
              hoje
            </span>
          </p>
        </div>
      ) : null}

      <Verdict
        pace={pace}
        availableCents={availableCents}
        spentCents={spentCents}
      />

      {pace.dailyPaceCents !== null || pace.averageDailySpendCents !== null ? (
        <dl className="border-border flex flex-wrap gap-x-8 gap-y-3 border-t pt-3 [&>div]:min-w-36">
          {/* Some quando a pessoa já passou do plano: não há "ainda dá para
              gastar" quando não dá, e um zero em verde ao lado de "você passou
              do plano" faz o card se contradizer na mesma linha. */}
          {pace.dailyPaceCents !== null && pace.status !== 'over' ? (
            <Stat
              label="Ainda dá para gastar"
              cents={pace.dailyPaceCents}
              tone="positive"
            />
          ) : null}
          {pace.averageDailySpendCents !== null ? (
            <Stat
              label="Você tem gastado"
              cents={pace.averageDailySpendCents}
              tone={warning ? 'negative' : 'muted'}
            />
          ) : null}
        </dl>
      ) : null}
    </section>
  )
}

/**
 * A barra: quanto do teto já saiu, com a marca de onde o mês está.
 *
 * A marca de hoje é uma LINHA, não uma cor — quem não distingue matiz continua
 * lendo a comparação. E a descrição para leitor de tela diz as duas
 * porcentagens na mesma frase, porque separadas elas não formam a informação.
 */
function PaceBar({
  spentPct,
  monthPct,
  warning,
}: {
  spentPct: number
  monthPct: number
  warning: boolean
}) {
  return (
    <div
      role="img"
      aria-label={`Você gastou ${spentPct}% do que dá para gastar, e ${monthPct}% do mês passou.`}
      className="relative h-3 w-full"
    >
      <div className="bg-muted absolute inset-0 rounded-full" />

      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-full transition-[width] duration-500',
          warning ? 'bg-negative' : 'bg-positive',
        )}
        style={{ width: `${spentPct}%` }}
      />

      <span
        aria-hidden="true"
        className="bg-foreground absolute inset-y-[-3px] w-0.5 rounded-full"
        style={{ left: `calc(${monthPct}% - 1px)` }}
      />
    </div>
  )
}

/** A frase que fecha a leitura. Uma por estado, e nenhuma julga. */
function Verdict({
  pace,
  availableCents,
  spentCents,
}: {
  pace: Pace
  availableCents: Cents
  spentCents: Cents
}) {
  const projected = pace.projectedSpendCents

  if (pace.status === 'noData') {
    return (
      <p className="text-muted-foreground text-sm text-balance">
        Ainda não há gasto lançado. O ritmo aparece assim que você lançar o
        primeiro.
      </p>
    )
  }

  if (pace.status === 'ended') {
    return (
      <p className="text-muted-foreground text-sm text-balance">
        O mês fechou com <Amount cents={spentCents} tone="default" /> de gasto
        livre, de um teto de{' '}
        <Amount cents={availableCents} tone="muted" punctuation="." />
      </p>
    )
  }

  if (pace.status === 'over') {
    return (
      <p className="text-negative-soft-foreground bg-negative-soft rounded-md px-3 py-2 text-sm text-balance">
        Você passou do plano este mês. Daqui até o fim, o que der para adiar
        conta a favor.
      </p>
    )
  }

  if (pace.status === 'ahead' && projected !== null) {
    return (
      <p className="text-negative-soft-foreground bg-negative-soft rounded-md px-3 py-2 text-sm text-balance">
        Neste ritmo, o mês fecha em{' '}
        <Amount cents={projected} tone="negative" punctuation="." /> O teto é{' '}
        <Amount cents={availableCents} tone="negative" punctuation="." /> Ainda
        dá para ajustar.
      </p>
    )
  }

  return (
    <p className="text-muted-foreground text-sm text-balance">
      {projected !== null ? (
        <>
          Neste ritmo, o mês fecha em{' '}
          <Amount cents={projected} tone="positive" punctuation="." /> O teto do
          mês é <Amount cents={availableCents} tone="muted" punctuation="." />
        </>
      ) : (
        <>
          Você gastou <Amount cents={spentCents} tone="default" /> de um teto de{' '}
          <Amount cents={availableCents} tone="muted" punctuation="." />
        </>
      )}
    </p>
  )
}

/**
 * Amount com a pontuação colada nele.
 *
 * `<MoneyValue>` é `inline-block`, então a vírgula ou o ponto que vêm logo
 * depois podem quebrar para a linha seguinte e aparecer órfãos no começo dela.
 * Num parágrafo curto isso é feio; ao lado de um número é pior, porque por um
 * instante parece parte do valor.
 */
function Amount({
  cents,
  tone,
  punctuation,
}: {
  cents: Cents
  tone: 'positive' | 'negative' | 'muted' | 'default'
  punctuation?: string
}) {
  return (
    <span className="whitespace-nowrap">
      <MoneyValue cents={cents} size="sm" tone={tone} />
      {punctuation}
    </span>
  )
}

function Stat({
  label,
  cents,
  tone,
}: {
  label: string
  cents: Cents
  tone: 'positive' | 'negative' | 'muted'
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>
        <MoneyValue cents={cents} size="md" tone={tone} />
        <span className="text-muted-foreground text-xs"> /dia</span>
      </dd>
    </div>
  )
}
