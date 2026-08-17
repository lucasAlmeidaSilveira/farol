---
description: Fluxo correto para mexer em cor no Farol, com verificação de contraste
allowed-tools: Bash, Read, Edit, Grep, Glob
argument-hint: "[a mudança de cor desejada]"
---

Mudança na paleta do Farol: $ARGUMENTS

**A paleta é gerada. Nunca edite cor direto no `src/app/globals.css`** — o bloco
de tokens está marcado como gerado e seria sobrescrito, e cada valor lá tem
contraste calculado par a par.

## O fluxo

1. Carregue `.claude/skills/design-system-farol/SKILL.md`
2. Edite **`scripts/palette-source.mjs`** — a fonte das cores, com `LIGHT` e
   `DARK`
3. `pnpm palette` — verifica o contraste de todos os pares e reprova o que não
   bate a meta
4. Só com o passo 3 verde: `pnpm palette:write` — regenera os tokens no CSS
5. `git diff src/app/globals.css` para conferir o que mudou

## As metas

- **7:1 (AAA) em todo texto**
- **4.5:1 em elemento de interface** — bordas de controle, fatias do gráfico

A norma permitiria 4.5 e 3.0. O Farol exige mais porque é lido no celular, no
mercado, sob sol — 3:1 passa na norma e continua desconfortável de enxergar.

Contraste **não se avalia no olho**: âmbar sobre branco parece legível e reprova
em 1.9:1. Se o script reprovou, o script está certo.

## Ao mudar ou adicionar token

- Adicione **nos dois temas**, claro e escuro
- Respeite a semântica: verde é "estar no verde"; ouro é a luz do farol e é
  **escasso de propósito**; terracota substitui vermelho porque vermelho é
  punição para quem já se sente mal com dinheiro; neutros são quentes, com traço
  de verde, nunca cinza puro
- Se o token entra em `@theme inline`, adicione o mapeamento
  `--color-<nome>: var(--<nome>)` também

## Ao final

Reporte a saída real do `pnpm palette` — com os números de contraste — e mostre o
diff dos tokens. Se algum par reprovou, **não force**: ajuste a cor na fonte até
passar, ou explique o trade-off e pergunte.
