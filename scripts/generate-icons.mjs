import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

/**
 * Gera os PNGs de ícone a partir dos SVGs em `assets/`.
 *
 * Os PNGs são versionados: rodar isto é passo de design, não de build. Assim o
 * deploy não depende do sharp e o ícone não muda sozinho entre builds.
 *
 * Uso: pnpm icons
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public/icons')

const TARGETS = [
  { source: 'app-icon.svg', name: 'icon-192.png', size: 192 },
  { source: 'app-icon.svg', name: 'icon-512.png', size: 512 },
  { source: 'app-icon.svg', name: 'apple-touch-icon.png', size: 180 },
  { source: 'app-icon-maskable.svg', name: 'icon-maskable-512.png', size: 512 },
]

await mkdir(out, { recursive: true })

for (const target of TARGETS) {
  const svg = await readFile(join(root, 'assets', target.source))

  const png = await sharp(svg, { density: 512 })
    .resize(target.size, target.size)
    .png({ compressionLevel: 9 })
    .toBuffer()

  await writeFile(join(out, target.name), png)
  console.log(`✓ ${target.name} (${target.size}px)`)
}

console.log(`\n${TARGETS.length} ícones gerados em public/icons/`)
