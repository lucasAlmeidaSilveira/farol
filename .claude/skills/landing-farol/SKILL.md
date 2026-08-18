---
name: landing-farol
description: >-
  A página pública do Farol (`/`) e a regra que a mantém verdadeira. Carregue
  SEMPRE que adicionar, alterar ou remover funcionalidade do app — a landing
  faz parte da entrega, no mesmo commit — e antes de tocar em
  `src/content/landing.ts`, `src/components/landing/` ou `src/app/(marketing)/`.
  Vale também para mudança de rota da navegação, texto público, SEO ou
  metadados de compartilhamento.
---

# A landing do Farol

`/` é a página pública. `/hoje` é o app. Quem chega pela primeira vez lê a
landing, entra por `/entrar` e cai no app — e a landing é a única peça do
repositório que fala com quem **ainda não é usuário**.

## A regra

**Funcionalidade nova não está pronta enquanto a landing não a conhece.** No
mesmo commit, não no próximo.

O motivo é que a landing envelhece de um jeito silencioso: ela não quebra
quando fica desatualizada — ela só passa a mentir. Um app que promete menos do
que faz perde instalação; um que promete o que não faz perde a pessoa no
segundo minuto, e essa não volta.

Dispara atualização (mudou **o que o app faz**):

- funcionalidade criada, ampliada ou removida
- tela nova na navegação, ou tela que sai
- mudança no fluxo de entrada (onboarding, provedores de login)
- promessa que muda de tamanho — offline, privacidade, custo, dados exigidos

Não dispara (mudou **como o app faz**):

- refatoração, renomeação, correção de bug sem efeito visível
- ajuste de layout que não muda o que a tela entrega
- mudança de infraestrutura, teste ou dependência

## Onde mexe o quê

```
src/content/landing.ts        TODO o texto e os exemplos. É aqui que se mexe.
src/content/landing.test.ts   Os guardas automáticos.
src/components/landing/       Apresentação. Não sabe nada sobre o produto.
src/app/(marketing)/          Rota `/`: layout público, metadados, JSON-LD.
src/app/robots.ts sitemap.ts  Indexação. Rota pública nova entra aqui também.
```

Na prática, 90% das mudanças são uma entrada em `FEATURES` ou uma linha de
`TOUR` em `src/content/landing.ts`. Se você precisou abrir um componente para
mudar texto, o texto estava no lugar errado — mova-o para o conteúdo.

**A funcionalidade merece uma peça do app ao lado?** Marque a entrada de
`FEATURES` com `demo`. Ela sai da grade e ganha uma faixa própria, com o
componente de verdade renderizado ao lado do texto (`feature-stories.tsx`). É
para as que só convencem quando vistas funcionando — hoje, o compromisso
proporcional, os vencimentos e a renda variável. Chave nova em `FeatureDemo`
reprova no `pnpm typecheck` até alguém dizer qual componente a desenha.

O mês que alimenta todas essas peças é `src/content/demo-month.ts`, calculado
pela engine de verdade com o `today` de agora. Mexer nele muda o exemplo da
página inteira de uma vez — inclusive as datas.

## Os guardas que já existem

Nenhum deles julga texto; todos pegam defasagem estrutural, que é o que passa
despercebido:

| Guarda                                                             | Pega                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `ICONS: Record<FeatureIcon, LucideIcon>` em `features-section.tsx` | funcionalidade com ícone novo e sem desenho — reprova no `pnpm typecheck`                                     |
| Teste `tour cobre todas as telas da navegação`                     | rota nova em `NAV_ITEMS` que a landing nunca menciona                                                         |
| Testes do mês de exemplo                                           | exemplo que deixou de mostrar o produto funcionando: sem sobra, sem conta a vencer ou sem compromisso na tela |
| Landing usa os componentes **reais** do app                        | print envelhecido: se o card muda de forma ou a regra muda de resultado, a página muda junto                  |
| Teste `não mostra conta atrasada`                                  | exemplo que, rodando dia 20, apresentava o app como se a pessoa tivesse perdido o controle                    |

O que **nenhum** guarda pega: promessa desatualizada em texto corrido. Essa é
sua responsabilidade, e é a razão desta skill existir.

## A ordem das seções é um argumento

Não reordene por gosto. Cada seção responde a pergunta que a anterior deixou
aberta:

1. **Dobra** — a pergunta que a pessoa já faz sozinha, e a resposta ao lado (o
   card real do app, com um exemplo). Promessa e prova na mesma tela.
2. **Problema** — nomeia a dor e a atribui à ferramenta, nunca à pessoa.
3. **Como funciona** — três passos, cada um com o próprio custo declarado.
4. **Funcionalidades** — confirma quem já foi convencido. Antes disso, ninguém
   liga.
5. **Por dentro** — o que existe depois do login. Tira a sensação de porta
   fechada.
6. **Dúvidas** — as objeções que travam o clique, ditas com todas as letras.
7. **Última chamada** — a mesma promessa, o mesmo botão. Nada novo.

Uma ação só na página inteira, repetida. Uma segunda ação de peso divide a
decisão e a página deixa de ter resposta óbvia.

## O movimento

A divisão é fixa, e sair dela é o jeito mais fácil de deixar a página pesada:

| O quê                                        | Onde                            | Por quê                                                                                                      |
| -------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Laço infinito — feixe, halo, varredura       | `@utility` no `globals.css`     | roda para sempre; em JS disputaria quadro com a rolagem                                                      |
| Entrada, direção, mola, progresso de rolagem | `components/landing/motion.tsx` | depende de onde a pessoa está; em CSS dependeria de `animation-timeline`, que ainda não existe em toda parte |

Use `<Reveal>` para tudo que entra. **Acima da dobra, passe `onMount`**: o que
está visível no primeiro quadro não pode depender de `IntersectionObserver`.

Três coisas que não se mexem sem substituir por equivalente:

- **`LazyMotion` com `strict`.** Importar o `motion` completo reprova em
  desenvolvimento — é o que impede o bundle de crescer sozinho.
- **`data-reveal` + o `<noscript>` do layout.** O Motion escreve `opacity: 0` já
  no HTML do servidor; sem essa regra, JavaScript quebrado é landing em branco.
- **`viewport={{ once: true }}`.** Reanimar a cada rolagem para cima enjoa e
  denuncia o truque.

O vocabulário é um só: **luz**. Feixe, halo, varredura, foco. Nada de elástico,
nada de objeto girando — um app de dinheiro que parece apresentação perde a
firmeza, que é a única coisa que ele precisa transmitir.

## A régua de honestidade

O público-alvo já foi decepcionado por app de finanças antes. A primeira
promessa quebrada custa a instalação inteira. Então, **proibido**:

- depoimento, contador de usuários, logo de imprensa, selo, nota de loja —
  o produto não tem base instalada e inventar uma é fraude
- contagem regressiva, "vagas limitadas", qualquer urgência fabricada. Pressa é
  o oposto do que este produto vende, que é calma diante do próprio dinheiro
- funcionalidade de versão futura escrita no presente
- número de exemplo sem a etiqueta de exemplo
- culpar quem lê. É a mesma decisão que trocou o vermelho por terracota na
  paleta: vergonha fecha a aba

## Tom

O mesmo do app: direto, sem adjetivo de marketing, sem exclamação. "Descubra
quanto você pode gastar" — não "revolucione suas finanças". Frase curta, uma
ideia por bloco, verbo no presente.

Dinheiro na tela passa por `<MoneyValue>`, inclusive aqui. Ninguém escreve
`R$` na mão, nem em página de marketing.

## Checklist antes de entregar

- [ ] A funcionalidade tem entrada em `FEATURES` (ou uma linha em `TOUR`, se
      for tela)
- [ ] Nada na página promete o que o app não faz hoje
- [ ] Exemplos continuam fechando (`pnpm test`)
- [ ] Rota pública nova entrou no `sitemap.ts`; rota privada nova entrou no
      `disallow` do `robots.ts`
- [ ] Testado em 375px de largura — a maioria chega pelo celular
- [ ] `pnpm typecheck && pnpm lint && pnpm test`
