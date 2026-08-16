import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  /**
   * A regra de dependência do projeto, aplicada pelo linter em vez de por
   * convenção: `app -> data -> engine -> domain`.
   *
   * `domain/` e `engine/` são puros. Se um deles importar Firebase, a engine
   * deixa de ser testável sem rede e o cálculo deixa de ser determinístico —
   * que é a única garantia que sustenta a corretude do app.
   */
  {
    files: ['src/domain/**/*.ts', 'src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['firebase', 'firebase/*', '@firebase/*'],
              message:
                'domain/ e engine/ são puros: nenhum acesso a Firebase. Mova a leitura para src/data/.',
            },
            {
              group: ['@/data/*', '@/app/*', '@/components/*', '@/hooks/*'],
              message:
                'domain/ e engine/ não podem depender de camadas acima. Inverta a dependência.',
            },
            {
              group: ['react', 'react-dom', 'next', 'next/*'],
              message:
                'domain/ e engine/ não conhecem framework. Mantenha-os como funções puras.',
            },
          ],
        },
      ],
    },
  },

  /** `domain/` é a base de tudo: não pode nem enxergar a engine. */
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'firebase',
                'firebase/*',
                '@firebase/*',
                '@/engine/*',
                '@/data/*',
                '@/app/*',
                '@/components/*',
                '@/hooks/*',
                'react',
                'react-dom',
                'next',
                'next/*',
              ],
              message:
                'src/domain/ só pode depender de zod. Ele é a base de todas as outras camadas.',
            },
          ],
        },
      ],
    },
  },

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    '.firebase/**',
  ]),
])

export default eslintConfig
