## O que muda

<!-- Uma ou duas frases. O "o quê" resumido; o detalhe está no diff. -->

## Por quê

<!-- A parte que o diff não conta: qual problema isso resolve, e por que desta
     forma e não de outra. É o que torna o PR revisável daqui a seis meses. -->

## Como verificar

<!-- O caminho exato para reproduzir. Ex.: "Ajustes > Ciclo do mês, trocar para
     5 e salvar; a prévia deve mostrar 05/08 a 04/09." -->

## Checklist

- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` passam
- [ ] Mexi em `domain/` ou `engine/` → cobertura continua em 100%
- [ ] Mexi em `firestore.rules` → `pnpm test:rules` passa e o deploy acompanha o merge
- [ ] Mexi em dinheiro → os valores são inteiros em centavos, sem `float`
- [ ] Mexi em UI → conferido nos temas claro e escuro, e em 360px de largura
