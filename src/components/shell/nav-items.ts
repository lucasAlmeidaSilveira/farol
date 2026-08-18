/**
 * A navegação, num lugar só.
 *
 * Barra lateral e barra inferior consomem esta lista: separar as duas levaria a
 * uma ganhar um item que a outra não tem, e a navegação passaria a depender da
 * largura da tela — que é exatamente o tipo de inconsistência que faz alguém
 * não achar no celular o que viu no computador.
 */
export const NAV_ITEMS = [
  { href: '/hoje', label: 'Hoje', glyph: '◉', hint: 'Quanto posso gastar' },
  { href: '/plano', label: 'Plano', glyph: '▤', hint: 'Renda e compromissos' },
  { href: '/mes', label: 'Mês', glyph: '☰', hint: 'Tudo que aconteceu' },
  { href: '/ajustes', label: 'Ajustes', glyph: '⚙', hint: 'Conta e aparência' },
] as const

export type NavItem = (typeof NAV_ITEMS)[number]
