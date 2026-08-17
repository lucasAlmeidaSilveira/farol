---
name: dados-firestore
description: >-
  Camada de dados do Farol — Firestore + TanStack Query, o registry de listeners
  com contagem de referências, escrita offline-first e as Security Rules.
  Carregue ANTES de tocar em `src/data/`, `src/hooks/` ou `firestore.rules`, ao
  criar query/mutation, ao investigar custo de leitura ou spinner que não para,
  e antes de qualquer deploy de rules.
---

# Camada de dados do Farol

`src/data/` é a **única** camada que conhece Firebase. `src/hooks/` consome
`src/data/` e expõe subscriptions e mutations para a UI. `domain/` e `engine/`
não sabem que Firebase existe — e o ESLint garante.

O MVP é **client-side puro**: não há backend, não há segredo de servidor. Quem
decide o que cada usuário pode ler e escrever é o **Google, executando as
Security Rules**. Guard de rota no cliente é UX, não segurança.

## Modelo de dados

Nada pertence a um usuário: **tudo pertence a um `Space`**. É o que permite o app
virar de individual para casal sem migração.

```
users/{uid}
spaces/{spaceId}
  members/{uid}          ← alcance: quem é membro vê o space
  incomeSources/{id}
  commitments/{id}
  categories/{id}
  entries/{id}
  periods/{period}       ← só existe se o mês foi ajustado ou fechado
```

**Nunca escreva string de coleção à mão.** Tudo passa por `src/data/paths.ts`,
tipado. Renomear uma coleção precisa ser uma mudança de uma linha.

As chaves de cache vivem em `src/data/query-keys.ts`. A chave **identifica a
subscription no registry**, então duas chamadas com a mesma chave compartilham um
listener. Array literal espalhado pelo código quebra essa garantia em silêncio.

## Leitura: o registry de listeners

`src/data/subscription.ts` mantém um registry com contagem de referências, e
`src/hooks/use-firestore-query.ts` é a ponte com o TanStack Query.

O modelo: **o Firestore é dono da verdade, o Query é dono do cache.** Cada
snapshot é empurrado com `setQueryData`; o `queryFn` existe só para resolver o
primeiro, para que `isPending`, `error` e os DevTools continuem funcionando.

Consequências que surpreendem quem vem de REST:

- **`staleTime: Infinity` e sem refetch em foco/reconexão.** O socket é a fonte
  de frescor; qualquer refetch é leitura desperdiçada, e leitura é dinheiro.
- **`invalidateQueries` depois de mutação é ANTI-PADRÃO.** O listener ecoa a
  escrita de volta sozinho, localmente, antes de chegar no servidor. Invalidar
  dispara uma leitura extra para receber o que já chegou. (O único
  `invalidateQueries` legítimo do projeto está no `error` do registry, para
  reabrir um listener que o Firestore encerrou.)
- **Três componentes com a mesma query geram UM listener.** O keep-alive de 30s
  cobre navegação rápida sem pagar leitura de novo.

**Regra de review: `onSnapshot` fora de `src/data/` ou `src/hooks/` é bug.**

Uma sessão fria faz ~90 leituras, contra 50.000/dia do plano gratuito. **Custo
alto é sintoma de bug, não de arquitetura** — o suspeito é sempre listener
duplicado, e a causa quase sempre é `queryKey` instável ou `subscribe` que
depende de valor fora da chave.

Para criar uma query nova: adicione a chave em `query-keys.ts`, o caminho em
`paths.ts`, e um hook que chame `useFirestoreQuery` com um `subscribe` que
dependa **apenas** de valores presentes na `queryKey`.

## Escrita: offline-first de verdade

O detalhe que quebra a maioria dos apps com Firestore:

> **Offline, a promise do `setDoc` NÃO RESOLVE.** Ela fica pendente até
> reconectar.

Quem faz `await setDoc(...)` seguido de `setSaving(false)` deixa o spinner
girando para sempre e a pessoa acha que o app travou.

O padrão da casa (ver `src/hooks/entries/use-create-entry.ts`):

- Dispare a escrita **sem `await`** (`void setDoc(...)`). Com persistência local,
  o Firestore já aplicou a mutação e o `onSnapshot` já emitiu o documento com
  `hasPendingWrites` — a tela já atualizou.
- O `.catch` serve para quando o **servidor recusa** (rules ou payload
  inválido), nunca para falta de rede. Nele, `toast.error(errorMessage(error))`.
- Payloads são montados em `src/data/payloads.ts`, e a leitura é validada por Zod
  em `src/data/parse.ts`. Documento que não valida não vira estado.

Campos derivados que a engine usa para agregação — como `period` no lançamento —
são **gravados**, não calculados em runtime. Se fossem calculados, mudar o dia de
início do ciclo reclassificaria todo o passado silenciosamente.

## Security Rules

`firestore.rules` é o gate real de autorização. Está organizado em helpers
(`isMember`, `canWrite`, `onlyFields`, `hasFields`, `unchanged`, `positiveCents`,
`isPeriod`, `periodMatchesDate`, …) e um bloco `match` por coleção.

Ao mexer nelas:

- **Valide forma e conteúdo, não só quem.** `onlyFields` impede campo extra,
  `hasFields` impede campo faltando, `unchanged` protege o que não pode mudar
  depois de criado.
- **`list` é negado por padrão** onde varrer a coleção seria vazamento — a
  descoberta de spaces é via collection group `/members`.
- **Rode `pnpm test:rules`.** Sobe e derruba um emulador efêmero sozinho (a única
  exceção à regra de não usar emulador — `@firebase/rules-unit-testing` não roda
  contra projeto de verdade). Exige JDK 21+, já resolvido no script.
- **Teste o caminho negativo.** Uma rule que permite o que deveria permitir mas
  não bloqueia o que deveria bloquear passa despercebida. Os testes vivem em
  `tests/rules/`.
- **Deploy é manual e separado do merge:** `pnpm rules:deploy:dev` e
  `pnpm rules:deploy:prod`. `pnpm test:rules` verde é pré-requisito de produção.

## Ambientes

Dois projetos Firebase, `farol-app-dev` e `farol-app-prod`, Firestore em
`southamerica-east1`. O desenvolvimento roda contra o **dev real, na nuvem** —
não há emulador no dia a dia. É a separação de projetos que garante que teste
não encoste em dado financeiro real: mesmo entrando com a mesma conta Google, o
UID é diferente por projeto.

**Nunca use `NEXT_PUBLIC_` em algo que seja segredo.** O Next inlina o valor no
bundle de qualquer arquivo que referencie a variável, e o vazamento é permanente
— inclusive em todo build já publicado. A `apiKey` do Firebase Web não é
credencial, é identificador de roteamento; quem defende os dados é Auth + Rules.

## Checklist antes de entregar

- [ ] Caminho novo em `paths.ts`, chave nova em `query-keys.ts`
- [ ] `subscribe` depende só do que está na `queryKey`
- [ ] Nenhum `invalidateQueries` depois de mutação
- [ ] Escrita sem `await`, com `.catch` tratando recusa do servidor
- [ ] Leitura validada por Zod em `parse.ts`
- [ ] Mexeu em rules? `pnpm test:rules` verde, com teste do caminho negativo
- [ ] `pnpm typecheck && pnpm lint`
