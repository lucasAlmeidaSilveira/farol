import { readFileSync, writeFileSync } from 'node:fs'

import { ratio } from './check-contrast.mjs'
import { DARK, LIGHT, MEASURED_AGAINST } from './palette-source.mjs'

/**
 * Gera os blocos de token do `globals.css` a partir da fonte única da paleta.
 *
 * Existe porque comentários de contraste escritos à mão SEMPRE desatualizam: o
 * valor muda, o número ao lado fica, e aí o comentário passa a afirmar uma
 * coisa falsa — que é pior do que não ter comentário nenhum. Aqui a razão é
 * calculada na hora da escrita.
 *
 * Uso: pnpm palette:write
 */

const START = '/* >>> tokens gerados por `pnpm palette:write` — não edite à mão */'
const END = '/* <<< fim dos tokens gerados */'

const kebab = (name) => name.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`)

function block(selector, palette, comment) {
  const lines = [`${selector} {`]
  if (comment) lines.push(`  /* ${comment} */`)

  for (const [name, value] of Object.entries(palette)) {
    const against = MEASURED_AGAINST[name]
    let note = ''

    if (against && value !== 'transparent') {
      const other = palette[against]
      if (other) {
        const value_ = ratio(value, other).toFixed(2)
        const level = Number(value_) >= 7 ? 'AAA' : Number(value_) >= 4.5 ? 'AA' : 'UI'
        note = ` /* ${value_}:1 sobre ${kebab(against)} — ${level} */`
      }
    }

    lines.push(`  --${kebab(name)}: ${value};${note}`)
  }

  lines.push('}')
  return lines.join('\n')
}

const generated = [
  START,
  block(':root', LIGHT, 'TEMA CLARO'),
  '',
  block('.dark', DARK, 'TEMA ESCURO'),
  END,
].join('\n')

const path = 'src/app/globals.css'
const css = readFileSync(path, 'utf8')

const start = css.indexOf(START)
const end = css.indexOf(END)

if (start === -1 || end === -1) {
  console.error(
    `Marcadores não encontrados em ${path}.\n` +
      `Insira as linhas abaixo onde os tokens devem ficar:\n\n${START}\n${END}\n`,
  )
  process.exit(1)
}

writeFileSync(path, css.slice(0, start) + generated + css.slice(end + END.length))
console.log(`✓ tokens escritos em ${path} com as razões calculadas`)
