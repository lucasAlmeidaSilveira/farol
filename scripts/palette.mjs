import { report } from './check-contrast.mjs'
import { DARK, LIGHT } from './palette-source.mjs'

/**
 * A paleta do Farol, com todos os pares verificados em AAA.
 *
 * Direção: verde-dinheiro sobre neutros claros e quentes.
 *
 * - VERDE é o gatilho psicológico central. "Estar no verde" é a sensação que o
 *   app existe para dar, então o número principal é verde e grande.
 * - OURO é a luz do farol: reservado ao compromisso proporcional e à ação
 *   primária. Escasso de propósito — ouro em tudo deixa de significar algo.
 * - TERRACOTA no lugar de vermelho. Para quem já se sente mal com dinheiro,
 *   vermelho é punição; terracota chama atenção sem envergonhar.
 * - NEUTROS QUENTES (com traço de verde) em vez de cinza: planilha é fria, e
 *   frieza é exatamente o que afasta esse público.
 *
 * Meta: 7:1 em todo TEXTO e 4.5:1 em elementos de interface. A norma permitiria
 * 4.5 e 3.0 — mas este app é lido no celular, no mercado, sob sol.
 */

let failures = 0

failures += report('TEMA CLARO — texto (alvo 7:1)', [
  ['foreground / background', LIGHT.foreground, LIGHT.background],
  ['foreground / card', LIGHT.foreground, LIGHT.card],
  ['foreground / muted', LIGHT.foreground, LIGHT.muted],
  ['muted-foreground / card', LIGHT.mutedForeground, LIGHT.card],
  ['muted-foreground / muted', LIGHT.mutedForeground, LIGHT.muted],
  ['muted-foreground / background', LIGHT.mutedForeground, LIGHT.background],
  ['primary-foreground / primary', LIGHT.primaryForeground, LIGHT.primary],
  ['secondary-foreground / secondary', LIGHT.secondaryForeground, LIGHT.secondary],
  ['accent-foreground / accent', LIGHT.accentForeground, LIGHT.accent],
  ['positive / card', LIGHT.positive, LIGHT.card],
  ['positive / background', LIGHT.positive, LIGHT.background],
  ['positive-soft-fg / positive-soft', LIGHT.positiveSoftForeground, LIGHT.positiveSoft],
  ['negative / card', LIGHT.negative, LIGHT.card],
  ['negative-soft-fg / negative-soft', LIGHT.negativeSoftForeground, LIGHT.negativeSoft],
  ['covenant / card', LIGHT.covenant, LIGHT.card],
  ['covenant-soft-fg / covenant-soft', LIGHT.covenantSoftForeground, LIGHT.covenantSoft],
])

failures += report('TEMA CLARO — o número principal (alvo 7:1)', [
  ['light / beacon  ← o número da home', LIGHT.light, LIGHT.beacon],
  ['light-out / beacon  ← folga negativa', LIGHT.lightOut, LIGHT.beacon],
  ['beacon-foreground / beacon', LIGHT.beaconForeground, LIGHT.beacon],
  ['beacon-muted / beacon', LIGHT.beaconMuted, LIGHT.beacon],
])

failures += report('TEMA CLARO — interface e fatias (alvo 4.5:1)', [
  ['input / card  ← borda de controle', LIGHT.input, LIGHT.card, 'ui'],
  ['input / background', LIGHT.input, LIGHT.background, 'ui'],
  ['ring / background', LIGHT.ring, LIGHT.background, 'ui'],
  ['accent-border / card  ← botão âmbar', LIGHT.accentBorder, LIGHT.card, 'ui'],
  ['border / card  ← separador', LIGHT.border, LIGHT.card, 'border'],
  ['slice-covenant / beacon', LIGHT.sliceCovenant, LIGHT.beacon, 'ui'],
  ['slice-fixed / beacon', LIGHT.sliceFixed, LIGHT.beacon, 'ui'],
  ['slice-goal / beacon', LIGHT.sliceGoal, LIGHT.beacon, 'ui'],
  ['slice-spent / beacon', LIGHT.sliceSpent, LIGHT.beacon, 'ui'],
  ['slice-free / beacon', LIGHT.sliceFree, LIGHT.beacon, 'ui'],
])

failures += report('TEMA CLARO — marca (alvo 4.5:1)', [
  ['brand-tower / background', LIGHT.brandTower, LIGHT.background, 'ui'],
  ['brand-beam / background', LIGHT.brandBeam, LIGHT.background, 'ui'],
  ['brand-beam-soft / background', LIGHT.brandBeamSoft, LIGHT.background, 'ui'],
  ['brand-unlit / background', LIGHT.brandUnlit, LIGHT.background, 'ui'],
])

failures += report('TEMA ESCURO — marca (alvo 4.5:1)', [
  ['brand-tower / background', DARK.brandTower, DARK.background, 'ui'],
  ['brand-beam / background', DARK.brandBeam, DARK.background, 'ui'],
  ['brand-beam-soft / background', DARK.brandBeamSoft, DARK.background, 'ui'],
  ['brand-unlit / background', DARK.brandUnlit, DARK.background, 'ui'],
])

failures += report('TEMA ESCURO — texto (alvo 7:1)', [
  ['foreground / background', DARK.foreground, DARK.background],
  ['foreground / card', DARK.foreground, DARK.card],
  ['foreground / muted', DARK.foreground, DARK.muted],
  ['muted-foreground / card', DARK.mutedForeground, DARK.card],
  ['muted-foreground / muted', DARK.mutedForeground, DARK.muted],
  ['muted-foreground / background', DARK.mutedForeground, DARK.background],
  ['primary-foreground / primary', DARK.primaryForeground, DARK.primary],
  ['secondary-foreground / secondary', DARK.secondaryForeground, DARK.secondary],
  ['accent-foreground / accent', DARK.accentForeground, DARK.accent],
  ['positive / card', DARK.positive, DARK.card],
  ['positive-soft-fg / positive-soft', DARK.positiveSoftForeground, DARK.positiveSoft],
  ['negative / card', DARK.negative, DARK.card],
  ['negative-soft-fg / negative-soft', DARK.negativeSoftForeground, DARK.negativeSoft],
  ['covenant / card', DARK.covenant, DARK.card],
  ['covenant-soft-fg / covenant-soft', DARK.covenantSoftForeground, DARK.covenantSoft],
])

failures += report('TEMA ESCURO — número, interface e fatias', [
  ['light / beacon  ← o número da home', DARK.light, DARK.beacon],
  ['light-out / beacon', DARK.lightOut, DARK.beacon],
  ['beacon-muted / beacon', DARK.beaconMuted, DARK.beacon],
  ['input / card', DARK.input, DARK.card, 'ui'],
  ['border / card  ← separador', DARK.border, DARK.card, 'border'],
  ['ring / background', DARK.ring, DARK.background, 'ui'],
  ['slice-covenant / beacon', DARK.sliceCovenant, DARK.beacon, 'ui'],
  ['slice-fixed / beacon', DARK.sliceFixed, DARK.beacon, 'ui'],
  ['slice-goal / beacon', DARK.sliceGoal, DARK.beacon, 'ui'],
  ['slice-spent / beacon', DARK.sliceSpent, DARK.beacon, 'ui'],
  ['slice-free / beacon', DARK.sliceFree, DARK.beacon, 'ui'],
])

console.log(
  failures === 0
    ? '\n✓ Todos os pares atingem a meta.\n'
    : `\n✗ ${failures} par(es) abaixo da meta.\n`,
)

process.exit(failures === 0 ? 0 : 1)
