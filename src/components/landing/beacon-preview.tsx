import { BeaconCard } from '@/components/home/beacon-card'
import { beaconViewOf } from '@/components/home/beacon-view'
import { MoneyValue } from '@/components/money/money-value'
import { demoIncomeImpact, demoSummary } from '@/content/demo-month'
import { PREVIEW } from '@/content/landing'
import { todayIn } from '@/domain/period'

/**
 * A resposta antes do cadastro.
 *
 * O card aqui é o **componente real** do app, com os números saindo da engine
 * de verdade — não uma imitação feita para a landing. Isso resolve de uma vez
 * o problema mais comum de página de produto: o print envelhece, o produto
 * muda, e a página passa a mostrar algo que não existe mais. Se o `BeaconCard`
 * ou a regra de cálculo mudarem, a landing muda junto, no mesmo commit, sem
 * ninguém lembrar.
 *
 * O aviso de exemplo não é rodapé jurídico — é a mesma régua de honestidade do
 * resto da página. Número plausível sem etiqueta lê como número de verdade.
 */
export function BeaconPreview() {
  const today = todayIn('America/Sao_Paulo')
  const summary = demoSummary(today)

  return (
    <div className="flex flex-col gap-3">
      {/*
        A varredura do farol passando por cima do card.

        É o único movimento infinito da dobra, e ele existe por uma razão de
        marca: um farol é uma luz que varre. O ciclo é longo — 2,4s de passagem
        para 9s de espera — porque varredura sem intervalo vira pisca-pisca, e
        pisca-pisca em cima de um número de dinheiro lê como alerta.
      */}
      <div className="relative overflow-hidden rounded-2xl">
        <BeaconCard {...beaconViewOf(summary)} />

        <span
          aria-hidden="true"
          className="animate-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgb(255 255 255 / 0.28), transparent)',
          }}
        />
      </div>

      <ImpactChip today={today} />

      <p className="text-muted-foreground px-1 text-xs text-balance">
        {PREVIEW.note}
      </p>
    </div>
  )
}

/**
 * A simulação de impacto, do jeito que ela aparece no app: o que entrou, o que
 * isso puxou de compromisso e o que sobrou de folga.
 *
 * Vem logo abaixo do número porque responde à objeção que nasce ao olhar para
 * ele — "e quando entra dinheiro no meio do mês?". Uma dúvida respondida no
 * lugar onde ela aparece vale mais que uma seção inteira sobre o assunto.
 *
 * Os três valores vêm de `simulateIncome`, a diferença entre dois cálculos
 * completos da engine. Nunca a alíquota sobre o incremento: as duas contas
 * arredondam diferente, e a página estaria mentindo sobre o que o app faz.
 */
function ImpactChip({ today }: { today: ReturnType<typeof todayIn> }) {
  const impact = demoIncomeImpact(today)

  return (
    <div className="bg-card animate-rise flex flex-col gap-2 rounded-lg border px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-eyebrow text-muted-foreground uppercase">
          {PREVIEW.impactLabel}
        </span>
        <MoneyValue
          cents={impact.incomeCents}
          size="sm"
          tone="positive"
          sign="always"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          {PREVIEW.commitmentLabel}
          <MoneyValue
            cents={impact.commitmentDeltaCents}
            size="sm"
            tone="covenant"
            sign="always"
          />
        </span>

        <span aria-hidden="true" className="text-border text-sm">
          ·
        </span>

        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          {PREVIEW.freeLabel}
          <MoneyValue
            cents={impact.availableDeltaCents}
            size="sm"
            tone="positive"
            sign="always"
          />
        </span>
      </div>
    </div>
  )
}
