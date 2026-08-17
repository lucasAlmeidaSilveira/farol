# Farol — instruções para agentes

App de finanças pessoais que responde uma pergunta: _quanto eu posso gastar até o
fim do mês?_ O **`README.md` é a fonte de verdade** sobre problema, stack e
arquitetura — leia antes de propor qualquer mudança estrutural. Este arquivo tem
só o que **não dá para inferir lendo o código**: decisões fechadas, armadilhas
que falham em silêncio e o fluxo de trabalho.

> Carregado em toda sessão. Se algo aqui já está óbvio no código, o lugar é o
> código, não aqui.

## Comandos

| Comando | Quando | Detalhe que importa |
| --- | --- | --- |
| `pnpm dev` | Sempre | Roda contra o **`farol-app-dev` real, na nuvem**. Não há emulador no dia a dia. |
| `pnpm typecheck` | Antes de qualquer entrega | Roda `next typegen` **antes** do `tsc`. Não troque por `tsc --noEmit` direto: `LayoutProps`/`PageProps` são gerados em `.next/types` e um clone limpo reprova código correto sem eles. |
| `pnpm lint` | Antes de qualquer entrega | Tem `--fix`. No CI é `pnpm exec eslint`, sem fix — lá o lint reprova, não conserta. |
| `pnpm test` | Mexeu em `domain/` ou `engine/` | Vitest em ambiente `node`, sem jsdom e sem mock de Firebase. |
| `pnpm test:coverage` | Mexeu em `domain/` ou `engine/` | **100% de linhas, statements e functions.** Abaixo disso, reprova. |
| `pnpm test:rules` | Mexeu em `firestore.rules` | Sobe e derruba um emulador efêmero sozinho. Exige JDK 21+ — o script já prefixa o `openjdk@21` do Homebrew no `PATH`. **Não mexa no `java` global**, outros projetos dependem do 17. |
| `pnpm build` | Antes de abrir PR | Gera o service worker junto. |
| `pnpm palette` | Mexeu em cor | Verifica o contraste de todos os pares. |
| `pnpm palette:write` | Mexeu em cor | Regenera os tokens no `globals.css`. Edite `scripts/palette-source.mjs`, nunca o CSS. |

O gate antes de abrir PR é `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
— mais `pnpm test:rules` se as rules mudaram. Use `/verificar` para rodar tudo.

## Não faça

Cada item já custou tempo uma vez.

- **Não sugira emulador para o dia a dia.** Decisão de 2026-08-16: o
  desenvolvimento roda contra o `farol-app-dev` na nuvem, com
  `NEXT_PUBLIC_USE_EMULATORS=false`. A única exceção é `pnpm test:rules`, porque
  `@firebase/rules-unit-testing` não roda contra projeto de verdade.
- **Não rode `shadcn init` nem `shadcn add`.** O `init` reescreve o
  `globals.css`, que tem uma paleta com contraste calculado par a par. Os
  primitivos em `src/components/ui/` são escritos à mão seguindo a forma do
  shadcn — copie o código do componente oficial e adapte aos tokens locais.
- **Não use `competence` para competência.** É falso amigo. O termo é `Period`.
- **Não adicione `@rocketseat/eslint-config`.** Traz ESLint 8 e
  `@typescript-eslint` v6, que colidem com o `eslint-config-next` 16. O estilo da
  casa vive no Prettier + `simple-import-sort`.
- **Não troque `@serwist/turbopack` por `@serwist/next`.** O Turbopack é o
  bundler padrão do Next 16 e o plugin de webpack do `@serwist/next` não roda —
  falharia em silêncio, sem gerar service worker.
- **Não use `NEXT_PUBLIC_` em nada que seja segredo.** O Next inlina o valor no
  bundle de qualquer arquivo que referencie a variável. O MVP não tem segredo de
  servidor: a autorização inteira vive nas Security Rules.
- **Não dê `git push`.** Commit quando pedido; push é decisão do usuário.
- **Não faça deploy de rules junto com o merge.** `pnpm rules:deploy:prod` é
  manual e separado, de propósito, e exige `pnpm test:rules` verde antes.

## Invariantes de dinheiro

Quebrar qualquer uma destas é um bug de produção que aparece como centavo que
some. São a razão de `domain/` e `engine/` exigirem 100% de cobertura.

1. **Dinheiro é `Cents` (inteiro), percentual é `BasisPoints` (inteiro).** Nenhuma
   operação monetária toca `float` fora das funções auditadas de
   `src/domain/money.ts`. Os branded types existem para impedir que reais entrem
   onde se espera centavos.
2. **O rateio soma exatamente o total.** Compromisso proporcional calcula com a
   **soma das alíquotas** e só depois rateia por `allocateByWeights` (maior
   resto). Aplicar 10% e 5% separadamente e somar pode divergir de 15% — e a
   diferença aparece na tela, ao lado de um detalhamento que não fecha.
3. **A engine é pura e recebe `today` injetado.** `todayIn` é a única fronteira
   do domínio com o relógio. Ler `new Date()` dentro da engine quebra o
   determinismo, e os testes junto.
4. **Quitação (`settlement`) NÃO desconta do disponível.** O valor já foi
   reservado quando o mês foi calculado. Descontar de novo é contagem dupla — o
   erro mais fácil de cometer neste app, e há teste dedicado impedindo.
5. **`availableToSpendCents` pode ser negativo, e deve.** Limitar em zero
   esconderia exatamente a informação que o app existe para dar.
6. **Data é civil (`LocalDate`, `'YYYY-MM-DD'`), nunca `Date`.** Um gasto às 23h
   de 31/08 em São Paulo é 02h de 01/09 em UTC — com `Date`, o mês fecha errado.
7. **Mudou regra de cálculo? Incremente `ENGINE_VERSION`.** Meses fechados guardam
   a versão no snapshot e não mudam retroativamente.

## Regra de negócio: Comunhão de Bens

O caso de uso que dá forma ao app. É uma contribuição religiosa mensal de
**10% + 5% sobre toda a renda do mês** — fixas e variáveis. Como a renda variável
entra ao longo do mês, o valor **recalcula durante o mês**: quitar com base só no
salário e receber um freela no dia 20 gera um alerta `COMMITMENT_OUTSTANDING`.

Está modelada como o preset `covenant` de `ProportionalCommitment`, com duas
`parts` (10% e 5%) e `base` incluindo fixas e variáveis. **A engine não conhece o
nome** — para ela é um proporcional como outro qualquer. Mantenha assim: preset é
configuração, não ramo de código.

Detalhes em `.claude/skills/engine-financeira/SKILL.md`.

## Convenções

- **Identificadores em inglês, UI em pt-BR.** Decidido em 2026-08-15. Vale para
  tipos, funções, arquivos e chaves; textos visíveis e comentários em português.
- **Estilo:** sem ponto e vírgula, aspas simples, trailing comma, 80 colunas.
  Prettier + `simple-import-sort` resolvem — não formate à mão.
- **Arquitetura `app → data → engine → domain`, verificada pelo ESLint.**
  Importar Firebase, React ou Next dentro de `domain/`/`engine/` falha o lint com
  a mensagem explicando o porquê. Se a regra te bloqueou, a resposta é inverter a
  dependência, não desligar a regra.
- **Comentário explica _por quê_, nunca _o quê_.** O código do projeto segue isso
  à risca; siga também, e no mesmo tom — direto, sem adjetivo de marketing.
- **Commit no imperativo, explicando por quê.** O _o quê_ já está no diff.
- **`main` é sempre publicável.** Trabalho novo em `feat/…`, `fix/…`, `chore/…`.

## Onde está o quê

```
src/domain/     Cents, BasisPoints, Period, LocalDate, schemas Zod. Só depende de zod.
src/engine/     computeMonth e amigos. Função pura estado → MonthSummary.
src/data/       ÚNICA camada que conhece Firebase. paths.ts tem todos os caminhos.
src/hooks/      Subscriptions (useFirestoreQuery) e mutations, por domínio.
src/components/ ui/ (primitivos) + por feature.
src/app/        Rotas do App Router.
scripts/        Paleta e ícones. palette-source.mjs é a fonte das cores.
tests/rules/    Security Rules contra o emulador.
```

Pontos de entrada quando estiver perdido: `src/engine/compute.ts` (o
orquestrador), `src/domain/types.ts` (o contrato entre as camadas),
`src/data/paths.ts` (o mapa do Firestore).

## Armadilhas da camada de dados

- **`invalidateQueries` depois de mutação é anti-padrão aqui.** O `onSnapshot`
  ecoa a escrita de volta sozinho, localmente, antes de chegar no servidor.
  Invalidar dispara leitura extra — e leitura no Firestore é dinheiro.
- **Nunca escreva string de coleção à mão.** Tudo passa por `src/data/paths.ts`.
- **Nunca renderize `R$` na mão.** Só `<MoneyValue>` renderiza dinheiro: ele
  garante `tabular-nums`, o menos tipográfico (U+2212) e a leitura de tela.
- **Custo alto no Firestore é sintoma de bug, não de arquitetura.** O suspeito é
  sempre listener duplicado — veja o registry em `src/data/subscription.ts`.

## Skills e agentes deste repo

Carregue a skill antes de mexer na área correspondente:

| Skill | Para |
| --- | --- |
| `engine-financeira` | `src/domain/`, `src/engine/` — dinheiro, ciclo, compromissos |
| `dados-firestore` | `src/data/`, `src/hooks/`, `firestore.rules` |
| `design-system-farol` | `src/components/`, `globals.css`, paleta |

Subagentes: `revisor-financeiro` (auditar mudança em dinheiro), `dev-ui-farol`
(implementar tela ponta a ponta). Comandos: `/verificar`, `/rules`, `/paleta`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
