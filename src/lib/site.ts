/**
 * O endereço público do app.
 *
 * Serve às URLs absolutas que só o servidor monta: `metadataBase`, o canônico,
 * as tags de compartilhamento, o sitemap e o robots. Sem ele, o Next monta OG
 * relativo e a prévia do link chega quebrada em WhatsApp e Telegram — que é,
 * na prática, como uma landing é compartilhada por aqui.
 *
 * A ordem de resolução evita chumbar domínio no código: a variável explícita
 * ganha, a Vercel preenche sozinha no build de produção, e o resto cai em
 * localhost. `VERCEL_PROJECT_PRODUCTION_URL` NÃO tem prefixo `NEXT_PUBLIC_` de
 * propósito — este módulo só é lido no servidor, e marcar a variável como
 * pública sem necessidade é o hábito que um dia vaza o que não devia.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
