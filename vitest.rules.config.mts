import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * Testes das Security Rules e de integração, contra o emulador do Firestore.
 *
 * Separados da suíte principal porque exigem processo externo e execução
 * serial: o emulador é um estado compartilhado, e o `clearFirestore()` de um
 * arquivo apagaria os dados semeados por outro.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
})
