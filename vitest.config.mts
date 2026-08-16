import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  test: {
    // domain/ e engine/ são puros: sem jsdom, sem mock de Firebase.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Os testes de rules precisam do emulador rodando e de execução serial.
    // Vivem em `vitest.rules.config.mts`, rodados por `pnpm test:rules`.
    exclude: ['tests/rules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/engine/**'],
      // É um app de dinheiro. Nestas duas pastas, cobertura parcial não serve:
      // uma linha não testada no rateio é um centavo que some em produção.
      //
      // `branches` fica em 98, não 100, por um motivo específico: com
      // `noUncheckedIndexedAccess` ligado, buscas em Map e índices de array
      // exigem um `?? ZERO` defensivo mesmo quando a presença é garantida pela
      // estrutura. Esses ramos são inalcançáveis por construção — perseguir os
      // últimos 2% significaria remover as defesas ou escrever testes que
      // mentem sobre o que o código faz.
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 98,
      },
    },
  },
})
