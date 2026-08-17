---
description: Roda o gate completo do Farol (tipos, lint, testes, build) e conserta o que for mecânico
allowed-tools: Bash, Read, Edit, Grep, Glob
---

Rode o gate de verificação do Farol, na ordem, **parando no primeiro que falhar**
— os últimos são caros e não faz sentido rodá-los sobre código que já reprovou:

```bash
pnpm typecheck
pnpm exec eslint
pnpm test
pnpm build
```

Se `git status` mostrar mudança em `firestore.rules`, rode também
`pnpm test:rules` — ele sobe e derruba o emulador efêmero sozinho.

Se algo tocou em `src/domain/` ou `src/engine/`, troque `pnpm test` por
`pnpm test:coverage`: essas duas pastas exigem 100% de linhas, statements e
functions, e o teste comum não verifica o limiar.

## Ao falhar

- **Falha mecânica** (formatação, ordem de import, tipo óbvio, import não usado):
  conserte e rode de novo. `pnpm lint` tem `--fix`.
- **Falha de lógica ou de cobertura**: **não conserte por conta própria**.
  Reporte o arquivo, a linha e a mensagem real, e pergunte como seguir. Baixar
  limiar de cobertura ou adicionar `eslint-disable` para passar no gate está
  fora de questão.
- **Falha na regra de arquitetura** (`domain/`/`engine/` importando Firebase,
  React ou Next): a correção é inverter a dependência, nunca desligar a regra.

## Ao final

Reporte a saída **real** de cada comando, em uma linha cada. Não escreva "tudo
certo" sem ter visto os quatro passarem.
