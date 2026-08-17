---
description: Fluxo completo para mexer nas Security Rules do Firestore, com testes e deploy manual
allowed-tools: Bash, Read, Edit, Grep, Glob
argument-hint: "[o que precisa mudar nas rules]"
---

Trabalho nas Security Rules do Firestore: $ARGUMENTS

As rules são o **gate real de autorização** do Farol. Não há backend: quem decide
o que cada usuário pode ler e escrever é o Google, executando `firestore.rules`.
Guard de rota no cliente é UX, não segurança.

## Antes de editar

1. Carregue `.claude/skills/dados-firestore/SKILL.md`
2. Leia `firestore.rules` inteiro — os helpers do topo (`isMember`, `canWrite`,
   `onlyFields`, `hasFields`, `unchanged`, `positiveCents`, `isPeriod`,
   `periodMatchesDate`) existem para serem reusados, não reescritos
3. Leia os testes existentes em `tests/rules/` para pegar a forma

## Ao editar

- **Valide forma e conteúdo, não só quem.** `onlyFields` impede campo extra,
  `hasFields` impede campo faltando, `unchanged` protege o que não pode mudar
  depois de criado.
- **`list` é negado por padrão** onde varrer a coleção seria vazamento.
- **Todo dado financeiro é alcançado pela fronteira do `Space`**, via
  `members/{uid}`. Nada pertence direto a um usuário.

## Testar — obrigatório

```bash
pnpm test:rules
```

Sobe e derruba um emulador efêmero sozinho. É a única exceção à regra de não usar
emulador no Farol: `@firebase/rules-unit-testing` não roda contra projeto de
verdade. Exige JDK 21+, já resolvido dentro do script — **não mexa no `java`
global**.

Adicione teste para o caminho **negativo**, não só o positivo. Uma rule que
permite o que deveria permitir mas não bloqueia o que deveria bloquear passa
despercebida — e é exatamente o bug que vaza dado.

## Deploy

É **manual e separado do merge**, de propósito:

```bash
pnpm rules:deploy:dev     # farol-app-dev
pnpm rules:deploy:prod    # farol-app-prod — exige test:rules verde
```

Não rode o deploy de produção sem confirmar comigo. Reporte a saída real do
`pnpm test:rules` antes de propor qualquer deploy.
