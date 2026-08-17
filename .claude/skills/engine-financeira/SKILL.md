---
name: engine-financeira
description: >-
  Regra de negócio e aritmética do Farol — centavos, basis points, rateio exato,
  ciclo financeiro, compromissos proporcionais (Comunhão de Bens), cenários
  previsto/considerado e o contrato da engine. Carregue ANTES de tocar em
  `src/domain/` ou `src/engine/`, ao mudar qualquer cálculo de dinheiro, ao
  adicionar tipo de compromisso ou preset, e ao investigar divergência de
  centavo entre total e detalhamento.
---

# Engine financeira do Farol

Esta é a parte do app onde erro custa dinheiro de verdade. Duas pastas, ambas
puras — sem Firebase, sem React, sem Next, sem relógio:

```
src/domain/   value objects, tipos, schemas Zod, presets. Só depende de zod.
src/engine/   cálculo. Só importa domain.
```

O ESLint reprova qualquer import fora dessa regra, com mensagem explicando o
porquê. Se a regra bloqueou você, a resposta é **inverter a dependência**, nunca
desligar a regra.

## Antes de escrever a primeira linha

Leia, nesta ordem — os arquivos são densamente comentados e explicam o _porquê_
de cada decisão:

1. `src/domain/money.ts` — a aritmética. Nada de dinheiro acontece fora daqui.
2. `src/domain/period.ts` — data civil e ciclo financeiro.
3. `src/domain/types.ts` — o contrato entre engine, dados e UI.
4. `src/engine/compute.ts` — o orquestrador.

## As sete invariantes

Cada uma tem teste dedicado. Quebrar uma é um bug que aparece como centavo que
some, meses depois, sem stack trace.

1. **Dinheiro é `Cents`, percentual é `BasisPoints`, ambos inteiros.** Os branded
   types impedem que reais entrem onde se espera centavos — o erro mais caro e
   mais silencioso de um app financeiro. Nenhuma operação monetária toca `float`
   fora das funções auditadas de `money.ts`.
2. **A soma das partes é exatamente o total.** `allocateByWeights` usa maior
   resto (Hare) com desempate determinístico pelo menor índice.
3. **`today` é injetado, nunca lido.** `todayIn(timeZone)` é a única fronteira do
   domínio com o relógio. Dentro da engine, `new Date()` é proibido.
4. **Quitação não desconta do disponível.** O valor já foi reservado no cálculo
   do mês. Descontar de novo é contagem dupla.
5. **`availableToSpendCents` pode ser negativo.** Não limite em zero.
6. **Data é `LocalDate` (`'YYYY-MM-DD'`), nunca `Date`.**
7. **Mudou a regra? Incremente `ENGINE_VERSION`** em `src/engine/types.ts`. Meses
   fechados guardam a versão e não mudam retroativamente.

## A aritmética disponível

Use estas funções; não reimplemente nenhuma.

| Função | Para |
| --- | --- |
| `cents(n)` / `basisPoints(n)` | Construir os branded types. Lançam em entrada inválida. |
| `parseBRL(texto)` | Texto digitado → centavos, **sem float intermediário**. Devolve `null` em entrada ambígua. É o que a UI usa. |
| `fromReais(n)` | Só seeds e testes. Passa por float. |
| `add` / `subtract` / `negate` / `maxOf` / `minOf` / `atLeastZero` | Aritmética. |
| `applyRate(base, rateBp)` | Alíquota com inteiro exato, metade para cima em valor absoluto. |
| `allocateByWeights(total, pesos)` | Rateio que soma exatamente o total. |
| `splitEvenly(total, n)` | Partes iguais preservando a soma. |
| `clamp(v, floor, ceiling)` | Piso/teto informando qual atuou. |
| `divideFloor(total, divisor)` | Divisão com piso — a sugestão diária arredonda para baixo, senão somaria mais do que a pessoa tem. |
| `formatBRL` / `formatRate` | Formatação. Na UI, prefira `<MoneyValue>`. |

Do lado do tempo: `cycleFor(period, cycleStart)`, `periodOf(date, cycleStart)`
(inversas, garantido por property test), `addMonths`, `monthsBetween`,
`addDays`, `daysBetween`, e `nthBusinessDay` / `isBusinessDay` /
`businessDaysInMonth` em `business-days.ts` (com feriados nacionais móveis
derivados de `easterSunday`).

## Os dois cenários

Todo compromisso é apurado **duas vezes, lado a lado**, na mesma passada:

- **`forecast`** — sobre a renda prevista. É o planejamento puro, útil com zero
  lançamentos.
- **`considered`** — sobre a renda que vale: prevista enquanto não confirmada,
  realizada depois. É o número que manda.

Cada cenário tem seu próprio acumulador de "já descontado", porque um
compromisso com `netOfPriorCommitments` incide sobre o líquido — e o líquido
previsto não é o mesmo que o líquido considerado. Ver `assessCommitments`.

`variance` usa **considerado − previsto** nas três dimensões. Não troque por
`recebido − previsto` na renda: mostraria −R$ 3.250 no dia 1º do mês, como se a
pessoa tivesse perdido o salário, quando ele só ainda não caiu.

## Compromisso proporcional — o ponto mais delicado

```
base → soma das alíquotas → applyRate → clamp(piso, teto) → allocateByWeights
```

A ordem importa e não é negociável:

- **Soma das alíquotas primeiro.** Aplicar 10% e 5% separadamente e somar pode
  divergir de aplicar 15% direto.
- **Rateio depois do piso/teto**, para que a soma das parcelas continue igual ao
  total exibido mesmo quando o limite atuou.

Se um detalhamento não fecha com o total na tela, o bug está nessa ordem.

### Comunhão de Bens

O caso de uso central, modelado como o preset `covenant`: `ProportionalCommitment`
com duas `parts` (`p1` 1000bp, `p2` 500bp), base `ALL_INCOME` (fixas + variáveis,
sem exclusões, sem desconto de anteriores) e `dueBusinessDay: 5`.

**A engine não conhece o nome.** Para ela é um proporcional como outro qualquer.
Mantenha assim — preset é configuração, não ramo de código. Os `id` das parcelas
(`'p1'`, `'p2'`) são estáveis de propósito: sobrevivem à renomeação do rótulo.

Consequência que define o comportamento do app: como a base inclui variável, o
valor **recalcula durante o mês**. Quitar com base só no salário e receber um
freela no dia 20 gera `COMMITMENT_OUTSTANDING` — não é bug, é a feature.

## Receitas

**Adicionar um preset de compromisso:** escreva a função em
`src/domain/presets.ts` devolvendo `CommitmentDraft<…>`, adicione o nome em
`CommitmentPreset` (`types.ts`) e teste em `presets.test.ts`. Não toque na
engine.

**Adicionar um tipo de compromisso** (hoje: `fixedAmount`, `proportional`,
`savingsGoal`): adicione o membro à união `Commitment`, e o `switch` de
`assessOne` em `commitments.ts` passa a reprovar no `tsc` até você tratar o caso
— é exaustivo de propósito. Atualize também os schemas Zod e as Security Rules.

**Mudar o vencimento:** `dueDay` e `dueBusinessDay` são dois campos anuláveis
excludentes, não uma união, porque é o formato que o Firestore e as rules
validam bem. A união derivada vive em `dueRuleOf`. `businessDay` **não** é o
mesmo que `dayOfMonth`: o quinto dia útil de agosto de 2026 é dia 7.

**Simular impacto de renda:** `simulateIncome` roda **dois `computeMonth`
completos** e devolve a diferença. Nunca calcule alíquota sobre o delta — com
piso, teto e `netOfPriorCommitments` o resultado divergiria.

## Testes

`pnpm test` para rodar, `pnpm test:coverage` para o gate.

**100% de linhas, statements e functions** em `domain/` e `engine/`. `branches`
fica em 98 por um motivo específico: com `noUncheckedIndexedAccess`, índices de
array exigem um `?? ZERO` defensivo mesmo quando a presença é garantida pela
estrutura — esses ramos são inalcançáveis por construção.

Use **property test com `fast-check`** quando a propriedade for universal, não
exemplos: `Σ partes === total` para qualquer entrada, `periodOf`/`cycleFor`
inversas para todo dia do mês. Exemplos isolados não pegam o caso de fevereiro.

## Checklist antes de entregar

- [ ] Nenhum `float`, `Math.round` ou `new Date()` fora das funções auditadas
- [ ] Alíquota somada antes de aplicar; rateio depois do clamp
- [ ] Cenários `forecast` e `considered` ambos tratados
- [ ] `ENGINE_VERSION` incrementado se a regra de cálculo mudou
- [ ] `pnpm test:coverage` verde nos limiares
- [ ] Property test quando a propriedade é universal
- [ ] `pnpm typecheck && pnpm lint`
