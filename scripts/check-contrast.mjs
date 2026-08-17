/**
 * Verificador de contraste WCAG 2.1 da paleta.
 *
 * Existe porque contraste NÃO se avalia no olho: âmbar sobre branco parece
 * legível e reprova em 1.9:1. Rodar isto é parte de mexer na paleta.
 *
 * Uso: pnpm palette
 */

const srgb = (channel) => {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  )
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
}

const ratio = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/**
 * A meta do Farol é AAA (7:1) para TEXTO.
 *
 * Para elementos de interface — bordas de controle, fatias do gráfico — a norma
 * só exige 3:1 e não define nível AAA. Ainda assim exigimos 4.5 aqui: 3:1 passa
 * na norma e continua desconfortável de enxergar, principalmente em tela de
 * celular sob luz do dia, que é onde este app é usado.
 */
const grade = (value, target) => {
  /*
    Bordas e separadores têm alvo próprio de 3:1, e não 4.5.
    Não é concessão: uma linha divisória a 4.5:1 vira um traço pesado que
    compete com o conteúdo em vez de organizá-lo. 3:1 é o limite da norma para
    elementos de interface e é o ponto onde a borda é claramente visível sem
    virar protagonista.
  */
  if (target === 'border') {
    if (value >= 3) return 'visível (3:1)'
    return '✗ fraca demais'
  }

  if (target === 'ui') {
    if (value >= 4.5) return 'AAA-alvo (UI)'
    if (value >= 3) return '⚠ passa na norma, mas fraco'
    return '✗ REPROVA'
  }

  if (value >= 7) return 'AAA'
  if (value >= 4.5) return '⚠ só AA'
  return '✗ REPROVA'
}

export function report(title, pairs) {
  console.log(`\n${title}`)
  console.log('─'.repeat(76))

  let failures = 0

  for (const [label, fg, bg, target = 4.5] of pairs) {
    const value = ratio(fg, bg)
    const verdict = grade(value, target)
    if (verdict.startsWith('✗')) failures += 1

    console.log(
      `${label.padEnd(42)} ${value.toFixed(2).padStart(6)}  ${verdict}`,
    )
  }

  return failures
}

export { ratio }
