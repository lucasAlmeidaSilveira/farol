<div align="center">

<img src="public/icons/icon-192.png" alt="" width="88" height="88">

# Farol

**Clareza sobre o seu dinheiro.**

Um app de finanças pessoais que responde uma pergunta só: _quanto eu posso gastar até o fim do mês?_

</div>

---

## O problema

Apps de finanças costumam pedir disciplina de lançamento antes de entregar qualquer valor. Quem mais precisa de controle é justamente quem não tem essa disciplina — e desiste na segunda semana, com um app cheio de campos vazios e nenhuma resposta.

O Farol inverte a ordem: **começa pelo planejamento** (renda − compromissos = disponível) e trata o lançamento de gastos como refinamento opcional. Ele é útil no primeiro minuto, com zero lançamentos.

O número principal se ajusta sozinho conforme a renda variável entra — inclusive os compromissos proporcionais, que são recalculados sobre a renda real do mês.

## Funcionalidades

- **Um número em destaque** — livre para gastar no mês, com ritmo diário sugerido
- **Compromissos proporcionais** — percentuais sobre a renda, com rateio exato entre parcelas
- **Renda fixa e variável** — o previsto vale enquanto o realizado não chega
- **Vencimentos** — por dia do mês ou por _dia útil_, com lembrete ordenado por data
- **Simulação de impacto** — ao registrar uma renda, mostra quanto sobe cada compromisso e a folga
- **Offline de verdade** — PWA instalável; lançar sem rede funciona e sincroniza depois
- **Temas claro, escuro e do sistema** — paleta verificada em contraste AAA
- **Landing pública** — `/` apresenta o app a quem ainda não entrou; o texto
  vive em `src/content/landing.ts` e acompanha toda mudança de funcionalidade

## Stack

| Camada          | Escolha                                                                            |
| --------------- | ---------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack) · React 19                                      |
| Linguagem       | TypeScript strict + `noUncheckedIndexedAccess`                                     |
| Estilo          | Tailwind CSS v4 · shadcn/ui sobre Radix                                            |
| Estado servidor | TanStack Query v5 ligado ao `onSnapshot` do Firestore                              |
| Backend         | Firebase Auth + Firestore (client-side puro)                                       |
| Validação       | Zod v4                                                                             |
| Testes          | Vitest · fast-check · `@firebase/rules-unit-testing`                               |
| Movimento       | [Motion](https://motion.dev) (`m` + `domAnimation`) · CSS só nos laços de ambiente |
| PWA             | Serwist                                                                            |

## Arquitetura

A dependência é unidirecional e **verificada pelo ESLint**, não por convenção:

```
app → data → engine → domain
```

```
src/
├── domain/       value objects, tipos e schemas Zod. Só depende de zod.
├── engine/       cálculo puro (state → summary). Só importa domain.
├── data/         ÚNICA camada que conhece Firebase
├── hooks/        subscriptions e mutations, por domínio
├── components/   ui/ (shadcn) + por feature
├── content/      texto da landing — o que o app promete em público
└── app/          rotas do App Router
```

As rotas se dividem em três grupos, e a divisão é de acesso, não de estética:
`(marketing)` é a landing em `/`, pública e estática; `(auth)` é `/entrar`; e
`(app)` é o produto atrás do `SessionGate`, começando em `/hoje`.

Três invariantes sustentam o resto:

1. **A engine é uma função pura.** Nada de saldo incremental — entrou um lançamento, recalcula o mês inteiro. São dezenas de documentos, custa microssegundos, e elimina classes inteiras de bug de dessincronização.
2. **Dinheiro é inteiro em centavos, sempre.** Percentual é inteiro em basis points. Nenhuma operação monetária toca `float` fora das funções de arredondamento auditadas.
3. **`domain/` e `engine/` não conhecem Firebase, React nem Next.** Tentar importar qualquer um deles falha o lint com uma mensagem explicando o porquê.

Consequência prática: a lógica de cálculo roda e é testada sem nenhum serviço no ar.

## Começando

**Pré-requisitos:** Node 20.9+ e [pnpm](https://pnpm.io) 10+. JDK 21+ só é necessário para rodar `pnpm test:rules`.

```bash
pnpm install
cp .env.example .env.local   # preencha com a config do seu projeto Firebase
pnpm dev                     # http://localhost:3000
```

Nenhum valor do `.env.example` é segredo — a `apiKey` do Firebase Web é um identificador de roteamento, não uma credencial. Quem defende os dados é o Auth somado às Security Rules.

O desenvolvimento roda contra o projeto **`farol-app-dev`**, na nuvem. São dois projetos Firebase separados, e é essa separação que garante que nada de teste encoste em dado financeiro real: mesmo entrando com a mesma conta Google nos dois, o UID é diferente por projeto, e todo dado do Farol pertence a um `Space` alcançado via `members/{uid}`.

Uma sessão fria do app faz ~90 leituras, contra as 50.000/dia do plano gratuito — mais de 100× de folga. **Custo aqui não é problema de arquitetura, é sintoma de bug**, e o suspeito de sempre é listener duplicado; o registry com contagem de referências em `src/data/subscription.ts` existe justamente para isso.

## Scripts

| Comando              | O que faz                                                     |
| -------------------- | ------------------------------------------------------------- |
| `pnpm dev`           | Servidor de desenvolvimento                                   |
| `pnpm build`         | Build de produção (inclui o service worker)                   |
| `pnpm typecheck`     | `tsc --noEmit`                                                |
| `pnpm lint`          | ESLint com `--fix`                                            |
| `pnpm test`          | Testes unitários                                              |
| `pnpm test:coverage` | Cobertura (100% em `domain/` e `engine/`)                     |
| `pnpm test:rules`    | Testes das Security Rules (sobe e derruba o emulador sozinho) |
| `pnpm palette`       | Verifica o contraste de toda a paleta                         |
| `pnpm palette:write` | Regenera os tokens de cor no `globals.css`                    |

## Testes

```bash
pnpm test && pnpm test:rules
```

`domain/` e `engine/` exigem **100% de linhas, statements e funções**. É um app de dinheiro: uma linha não testada no rateio é um centavo que some em produção. Entre os casos que precisam continuar passando:

- `allocateByWeights` — property test garantindo `Σ partes === total` para qualquer entrada
- `cycleFor` e `periodOf` são inversas para todo dia do mês, fevereiro incluído
- Quitação **não** altera o disponível (o teste que impede contagem dupla)
- Impacto de renda é a diferença entre dois cálculos completos, nunca uma alíquota sobre o delta

As Security Rules são o gate real de autorização, e **`pnpm test:rules` verde é pré-requisito de todo deploy de rules em produção**.

## Fluxo de contribuição

Este é um projeto pessoal, mas segue as convenções que valem para qualquer repositório:

- **`main` é sempre publicável.** Trabalho novo vive em branch (`feat/…`, `fix/…`, `chore/…`).
- **Um PR por assunto.** PR que mistura refatoração e feature é PR que ninguém revisa direito.
- **Antes de abrir o PR:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- **Mexeu em `firestore.rules`?** `pnpm test:rules` também, e o deploy das rules acompanha o merge.
- **Mensagem de commit** no imperativo, explicando **por quê** — o _o quê_ já está no diff.

## Trabalhando com agentes

O repositório versiona as instruções que um agente de código precisa para não
repetir decisões já fechadas. Elas viajam junto no clone:

```
AGENTS.md                    decisões, invariantes e armadilhas (CLAUDE.md aponta para cá)
.claude/settings.json        permissões + hooks de formatação e de conferência da landing
.claude/skills/              engine-financeira · dados-firestore · design-system-farol · landing-farol
.claude/agents/              revisor-financeiro · dev-ui-farol
.claude/commands/            /verificar · /rules · /paleta
```

A landing tem tratamento próprio porque envelhece de um jeito silencioso: ela
não quebra quando fica desatualizada, só passa a mentir. A skill `landing-farol`
diz quando ela precisa acompanhar uma mudança, um hook lembra disso ao editar
área de funcionalidade, e `src/content/landing.test.ts` reprova o que dá para
verificar sozinho — exemplo cuja conta não fecha e tela do app que a página
nunca menciona.

Skills instaladas de fora (`npx skills add`) seguem a regra oposta: o que é
versionado é o `skills-lock.json`, com origem e hash de cada uma, e
`npx skills experimental_install` restaura. Os dados delas ficam no
`.gitignore` — são megabytes de terceiro, e o lock já garante que todo clone
receba exatamente a mesma versão.

O bloco `nextjs-agent-rules` no fim do `AGENTS.md` é escrito pelo `next dev` e se
regenera sozinho — o conteúdo acima dele é preservado. `.claude/settings.local.json`
é pessoal e fica no `.gitignore`.

## Segurança

- **Nunca** use o prefixo `NEXT_PUBLIC_` em algo que seja segredo. O Next inlina o valor no bundle de qualquer arquivo que referencie a variável, e uma chave de service account publicada assim está comprometida de forma permanente — inclusive em todo build já publicado.
- O MVP **não tem segredo de servidor**: a autorização inteira vive nas Security Rules, executadas pelo Google.
- Proteção de rota no cliente é UX, não segurança. Quem remover o guard no devtools vê um shell vazio, porque o Firestore recusa os dados.

Encontrou uma vulnerabilidade? Abra uma issue **sem detalhes de exploração** e o contato é feito em seguida.

## Licença

Sem licença definida. Todos os direitos reservados.
