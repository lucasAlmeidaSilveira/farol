/**
 * A FONTE ÚNICA da paleta do Farol.
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
 * Meta: 7:1 (AAA) em todo TEXTO, 4.5:1 em elementos de interface e 3:1 em
 * separadores. A norma permitiria menos — mas este app é lido no celular, no
 * mercado, sob sol.
 *
 * Mexeu aqui? Rode `pnpm palette` para conferir e `pnpm palette:write` para
 * regravar os tokens no globals.css com as razões recalculadas.
 */

export const LIGHT = {
  background: '#F4F9F6',
  card: '#FFFFFF',
  foreground: '#0B2620',
  muted: '#E5EFEA',
  mutedForeground: '#33544A',
  border: '#78988A',
  input: '#4F6E64',
  ring: '#075940',

  primary: '#075940',
  primaryForeground: '#FFFFFF',
  secondary: '#E5EFEA',
  secondaryForeground: '#08402F',

  accent: '#F0B93F',
  accentForeground: '#241900',
  accentBorder: '#6E4C05',

  positive: '#066143',
  positiveSoft: '#DCF0E6',
  positiveSoftForeground: '#054A34',
  negative: '#8F3218',
  negativeSoft: '#FAE7E0',
  negativeSoftForeground: '#6E2411',
  covenant: '#664804',
  covenantSoft: '#FBF0D8',
  covenantSoftForeground: '#5A3F03',

  beacon: '#DFF1E8',
  beaconForeground: '#0B2620',
  beaconMuted: '#33544A',
  beaconTrack: '#BBDCCC',
  light: '#064A34',
  lightDim: '#066143',
  lightOut: '#8A3016',

  sliceCovenant: '#7A5605',
  sliceFixed: '#16536F',
  sliceGoal: '#3A5F25',
  sliceSpent: '#48594F',
  sliceFree: '#066143',
  cardForeground: '#0B2620',
  popover: '#FFFFFF',
  popoverForeground: '#0B2620',
  destructive: '#8F3218',
  destructiveForeground: '#FFFFFF',

  // Marca. Tokens próprios para o símbolo acompanhar o tema — com cor fixa,
  // o logo sumia no escuro. Medidos contra `background`, que é onde ele vive
  // (cabeçalho, tela de login, estados vazios).
  brandTower: '#0B2620',
  brandBeam: '#6E4C05',
  brandBeamSoft: '#8A5F0A',
  brandUnlit: '#4F6E64',
}

export const DARK = {
  background: '#061B16',
  card: '#0C261F',
  foreground: '#E7F2EC',
  muted: '#12332A',
  mutedForeground: '#A8C6BB',
  border: '#4E7566',
  input: '#7BA394',
  ring: '#6FE3B5',

  primary: '#6FE3B5',
  primaryForeground: '#052018',
  secondary: '#12332A',
  secondaryForeground: '#E7F2EC',

  accent: '#F5C660',
  accentForeground: '#2A1D00',
  accentBorder: 'transparent',

  positive: '#6FE3B5',
  positiveSoft: '#0A2E23',
  positiveSoftForeground: '#9CF0CE',
  negative: '#FFAE8D',
  negativeSoft: '#2E1108',
  negativeSoftForeground: '#FFCDB8',
  covenant: '#F7D183',
  covenantSoft: '#2A1F07',
  covenantSoftForeground: '#F7D183',

  beacon: '#0A2620',
  beaconForeground: '#E7F2EC',
  beaconMuted: '#A8C6BB',
  beaconTrack: '#193E32',
  light: '#7DEDC0',
  lightDim: '#6FE3B5',
  lightOut: '#FFAE8D',

  sliceCovenant: '#F5C660',
  sliceFixed: '#84C7E8',
  sliceGoal: '#AEDD82',
  sliceSpent: '#9BB5AB',
  sliceFree: '#7DEDC0',
  cardForeground: '#E7F2EC',
  popover: '#0C261F',
  popoverForeground: '#E7F2EC',
  destructive: '#FFAE8D',
  destructiveForeground: '#2E1108',

  brandTower: '#E7F2EC',
  brandBeam: '#F5C660',
  brandBeamSoft: '#F7D183',
  brandUnlit: '#7BA394',
}

/**
 * Contra qual token cada cor é medida, para o comentário gerado no CSS dizer a
 * verdade. Tokens ausentes daqui saem sem anotação.
 */
export const MEASURED_AGAINST = {
  foreground: 'background',
  mutedForeground: 'card',
  border: 'card',
  input: 'card',
  ring: 'background',
  primaryForeground: 'primary',
  secondaryForeground: 'secondary',
  accentForeground: 'accent',
  accentBorder: 'card',
  beaconForeground: 'beacon',
  beaconMuted: 'beacon',
  light: 'beacon',
  lightOut: 'beacon',
  positive: 'card',
  positiveSoftForeground: 'positiveSoft',
  negative: 'card',
  negativeSoftForeground: 'negativeSoft',
  covenant: 'card',
  covenantSoftForeground: 'covenantSoft',
  sliceCovenant: 'beacon',
  sliceFixed: 'beacon',
  sliceGoal: 'beacon',
  sliceSpent: 'beacon',
  sliceFree: 'beacon',
  cardForeground: 'card',
  popoverForeground: 'popover',
  destructiveForeground: 'destructive',
  brandTower: 'background',
  brandBeam: 'background',
  brandBeamSoft: 'background',
  brandUnlit: 'background',
}
