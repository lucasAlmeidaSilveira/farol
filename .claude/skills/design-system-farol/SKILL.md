---
name: design-system-farol
description: >-
  Design system do Farol — paleta gerada com contraste calculado par a par,
  tokens semânticos, tipografia, renderização de dinheiro e os primitivos em
  `src/components/ui/`. Carregue ANTES de tocar em `src/components/`,
  `src/app/globals.css` ou `scripts/palette-source.mjs`, ao criar tela ou
  componente, e sempre que pensar em mexer em cor.
---

# Design system do Farol

O público é quem **não sabe quanto recebe nem quanto gasta** e já se sente mal
com dinheiro. Toda decisão visual aqui responde a uma pergunta de psicologia,
não de estética. O app é lido no celular, no mercado, sob sol.

## A regra que mais custa quebrar

**A paleta é gerada. Não edite cor no `globals.css`.**

```
scripts/palette-source.mjs   ← a fonte. Edite AQUI.
pnpm palette                 ← verifica o contraste de todos os pares
pnpm palette:write           ← regenera os tokens no globals.css
```

O bloco de tokens no CSS está marcado como gerado. Cada valor tem o contraste
calculado ao lado (`8.37:1 sobre card — AAA`), e esses números foram
**calculados, não estimados**: âmbar sobre branco parece legível ao olho e
reprova em 1.9:1. É por isso que o script existe.

Metas: **7:1 (AAA) em todo texto** e **4.5:1 em elemento de interface**. A norma
permitiria 4.5 e 3.0 — o Farol exige mais porque 3:1 passa na norma e continua
desconfortável em tela de celular sob luz do dia.

**Não rode `shadcn init` nem `shadcn add`:** o `init` reescreve o `globals.css` e
leva a paleta junto. Precisa de um componente novo? Copie o código do shadcn
oficial e adapte aos tokens locais, escrevendo à mão em `src/components/ui/` —
os primitivos existentes seguem essa forma, então o componente oficial encaixa
depois sem conflito.

## A semântica das cores

Não escolha token por aparência; escolha por significado.

| Cor                 | Significa                            | Onde                                                                                                 |
| ------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Verde**           | "estar no verde" — o gatilho central | O número principal, `positive`, `primary`                                                            |
| **Ouro**            | a luz do farol                       | `accent`, `covenant`, ação primária. **Escasso de propósito**: ouro em tudo deixa de significar algo |
| **Terracota**       | atenção, nunca punição               | `negative`, `destructive`. Vermelho puro é punição para quem já se sente mal com dinheiro            |
| **Neutros quentes** | com traço de verde, nunca cinza puro | fundo, `muted`. Planilha é fria, e frieza afasta esse público                                        |

Famílias de token disponíveis, além das do shadcn (`background`, `foreground`,
`card`, `muted`, `border`, `input`, `ring`, `primary`, `secondary`, `accent`,
`destructive`):

- `beacon`, `beacon-foreground`, `beacon-muted`, `beacon-track` — o card do
  número principal
- `light`, `light-dim`, `light-out` — os estados do farol (aceso, fraco, apagado)
- `positive` / `negative` / `covenant`, cada um com par `-soft` e
  `-soft-foreground` para fundos suaves
- `slice-covenant`, `slice-fixed`, `slice-goal`, `slice-spent`, `slice-free` — as
  fatias do rateio

Todo token existe em claro e escuro. Ao adicionar um, adicione **nos dois temas**
e rode `pnpm palette` — o script reprova o par que não bate a meta.

## Dinheiro na tela

**`<MoneyValue>` é o único lugar do app que renderiza dinheiro.** Ninguém escreve
`R$` na mão. Ele garante, de uma vez:

1. `tabular-nums` (a utility `money`) — sem isso o dígito 1 é mais estreito e a
   coluna "dança" quando o valor atualiza em tempo real, que é o oposto do que um
   número confiável parece.
2. Sinal de menos U+2212, nunca hífen — mesma largura do dígito tabular, coluna
   alinhada.
3. Leitura de tela escrita para ser **ouvida** (`spokenBRL`), não os separadores
   da versão visual.

Props que importam: `size` (`hero` · `xl` · `lg` · `md` · `sm`), `tone`
(`default` · `positive` · `negative` · `muted` · `beacon` · `light` ·
`covenant`), `sign` (`auto` · `always` · `never`), `hideCentsWhenZero` para
reduzir ruído no número principal.

Entrada de valor é `<MoneyInput>` / `<AmountKeypad>`, que usam `parseBRL` — texto
digitado vira centavos **sem float intermediário**.

## Movimento

A animação existe para EXPLICAR o que aconteceu, nunca para enfeitar. Um card
que sobe ao aparecer diz "isto é novo"; um número que corre diz "isto mudou por
causa do que você fez". O resto é ruído — e num app de dinheiro, ruído lê como
instabilidade.

**Quem anima é o Motion** (`m` + `domAnimation`, nunca o `motion` completo —
o `LazyMotion` está em `strict` e reprova). As peças:

| Peça                             | Onde                           | Para                                                                  |
| -------------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `<Reveal>`                       | `components/motion/reveal.tsx` | entrada de um bloco. `onMount` acima da dobra, senão espera a rolagem |
| `<Stagger>` / `<StaggerItem>`    | idem                           | cascata de lista ou grade                                             |
| `AnimatePresence` + `forceMount` | primitivos de `ui/`            | camadas que precisam animar a SAÍDA (sheet, diálogo, popover, dica)   |
| `<CountingMoney>`                | `components/money/`            | o único lugar em que a animação É a informação                        |
| `transitions.ts`                 | `components/motion/`           | as durações da casa. Não invente número novo                          |

**Continua em CSS**, e o motivo importa:

- **Laço infinito de ambiente** — feixe, halo, varredura. Roda para sempre; em
  JS disputaria quadro com a rolagem.
- **Acordeão** — a altura de "aberto" vem de uma variável que o Radix mede.
  Fazer isso no Motion exigiria manter o conteúdo montado ao fechar, e conteúdo
  colapsado na árvore de acessibilidade é lido como se estivesse aberto.
- **Pulso do esqueleto** — carregando é exatamente quando não se quer JS extra.

Duas travas que não se removem: o `<noscript>` do layout raiz (o Motion escreve
`opacity: 0` no HTML do servidor — sem ele, JS quebrado é tela em branco) e o
`reducedMotion="user"` do provider.

## Escala e forma

- **Tipografia:** `text-hero` (o número principal) e `text-eyebrow` (rótulo em
  caixa alta) são tokens, não classes soltas. Fonte Inter via `--font-sans`.
- **Raio:** `--radius` 14px é a base. `sm` 8 · `md` 10 · `lg` 14 (cards) · `xl`
  20 (sheets) · `2xl` 28 (BeaconCard).
- **Sombra:** tingida de verde-escuro, **nunca preto puro**. `shadow-beam` é o
  brilho do farol vazando por baixo do card principal — use só ali.
- **Espaçamento:** `--gutter` (1.25rem) é a margem lateral do app.

## Acessibilidade que já está resolvida

Não desfaça sem substituir por algo equivalente:

- **As fatias do rateio se distinguem por três camadas independentes**: o gap de
  2px na cor do fundo, o padrão próprio (`slice-stripe`, `slice-dot`) e a forma
  diferente do marcador na legenda. Cores próximas em luminância não se
  distinguem para quem não percebe matiz — qualquer uma das três camadas,
  sozinha, já comunica.
- **Contraste AAA em texto**, verificado por script.
- **Leitura de tela em todo valor monetário**, via `MoneyValue`.
- O pull-to-refresh acidental sobre o card do número principal está desativado de
  propósito no `@layer base`.

## Componentes

```
src/components/ui/        primitivos (shadcn escrito à mão, sobre Radix)
src/components/money/     MoneyValue, MoneyInput
src/components/home/      BeaconCard, AllocationBar, CommitmentCard, DuePanel
src/components/plan/      sheets de renda, gasto e vencimento
src/components/entries/   entrada rápida, teclado, impacto de renda
src/components/shell/     AppShell, Sidebar, MobileNav, PageHeader
src/components/brand/     marca, wordmark, lockup
```

Convenções: variantes com `cva`, composição de classe com `cn` de `@/lib/utils`,
ícones do `lucide-react`, `'use client'` só onde há estado ou efeito. Mobile-first
— o app é um PWA instalável e a tela pequena é o caso principal, não o
responsivo de última hora.

## Checklist antes de entregar

- [ ] Nenhuma cor literal: só token semântico
- [ ] Mexeu em cor? Editou `palette-source.mjs`, rodou `pnpm palette` (verde) e
      `pnpm palette:write`
- [ ] Todo valor monetário passa por `<MoneyValue>`
- [ ] Ouro usado com parcimônia — se está em tudo, não está significando nada
- [ ] Testado em tema claro **e** escuro
- [ ] Foco visível por teclado e alvo de toque confortável no celular
- [ ] `pnpm typecheck && pnpm lint`
