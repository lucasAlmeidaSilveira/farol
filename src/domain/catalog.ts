/**
 * Catálogo de gastos recorrentes conhecidos.
 *
 * Existe para responder a pergunta que um total agregado nunca responde: "eu
 * pago por O QUÊ?". Saber que saem R$ 180 de assinaturas não muda
 * comportamento; ver Netflix, Spotify, HBO Max e Disney+ lado a lado, cada um
 * com seu valor, muda — porque aí dá para cancelar UM.
 *
 * IMPORTANTE sobre os valores: são pontos de partida para o usuário ajustar,
 * NÃO preços oficiais. Preço de assinatura muda toda hora e varia por plano;
 * o objetivo aqui é economizar digitação, não acertar o centavo. A UI diz isso
 * explicitamente, e o campo já abre editável.
 */

export type CatalogGroup =
  | 'streaming'
  | 'music'
  | 'telecom'
  | 'home'
  | 'transport'
  | 'health'
  | 'education'
  | 'finance'

export type CatalogItem = {
  readonly id: string
  readonly name: string
  readonly emoji: string
  readonly group: CatalogGroup
  /** Valor típico em centavos. Sugestão editável, nunca preço oficial. */
  readonly suggestedCents: number
  /** Termos alternativos de busca, para quem digita o nome popular. */
  readonly aliases?: readonly string[]
  /**
   * Aparece na lista curta do onboarding.
   *
   * O onboarding tem meta de 2 minutos: 40 itens ali viram parede. Só os que a
   * maioria das pessoas realmente tem entram de cara; o resto fica a uma busca
   * de distância.
   */
  readonly common?: boolean
}

export const CATALOG_GROUPS: Record<
  CatalogGroup,
  { label: string; emoji: string }
> = {
  streaming: { label: 'Streaming e vídeo', emoji: '📺' },
  music: { label: 'Música e áudio', emoji: '🎧' },
  telecom: { label: 'Celular e internet', emoji: '📱' },
  home: { label: 'Casa', emoji: '🏠' },
  transport: { label: 'Transporte', emoji: '🚗' },
  health: { label: 'Saúde e bem-estar', emoji: '💪' },
  education: { label: 'Educação', emoji: '📚' },
  finance: { label: 'Serviços financeiros', emoji: '💳' },
}

export const CATALOG: readonly CatalogItem[] = [
  // ---------------------------------------------------------- streaming
  {
    id: 'netflix',
    common: true,
    name: 'Netflix',
    emoji: '🍿',
    group: 'streaming',
    suggestedCents: 4490,
  },
  {
    id: 'max',
    name: 'Max',
    emoji: '🎬',
    group: 'streaming',
    suggestedCents: 2990,
    aliases: ['hbo', 'hbo max'],
  },
  {
    id: 'disney',
    name: 'Disney+',
    emoji: '🏰',
    group: 'streaming',
    suggestedCents: 4390,
    aliases: ['disney plus', 'star'],
  },
  {
    id: 'prime',
    name: 'Prime Video',
    emoji: '📦',
    group: 'streaming',
    suggestedCents: 1490,
    aliases: ['amazon'],
  },
  {
    id: 'globoplay',
    name: 'Globoplay',
    emoji: '📡',
    group: 'streaming',
    suggestedCents: 2290,
  },
  {
    id: 'appletv',
    name: 'Apple TV+',
    emoji: '🍎',
    group: 'streaming',
    suggestedCents: 2190,
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    emoji: '⛰️',
    group: 'streaming',
    suggestedCents: 1990,
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    emoji: '🍥',
    group: 'streaming',
    suggestedCents: 1500,
    aliases: ['anime'],
  },

  // -------------------------------------------------------------- música
  {
    id: 'spotify',
    common: true,
    name: 'Spotify',
    emoji: '🎵',
    group: 'music',
    suggestedCents: 2190,
  },
  {
    id: 'youtube-premium',
    name: 'YouTube Premium',
    emoji: '▶️',
    group: 'music',
    suggestedCents: 2490,
    aliases: ['youtube'],
  },
  {
    id: 'deezer',
    name: 'Deezer',
    emoji: '🎶',
    group: 'music',
    suggestedCents: 2090,
  },
  {
    id: 'applemusic',
    name: 'Apple Music',
    emoji: '🎼',
    group: 'music',
    suggestedCents: 2190,
  },

  // ------------------------------------------------------------ telecom
  {
    id: 'celular',
    common: true,
    name: 'Plano de celular',
    emoji: '📱',
    group: 'telecom',
    suggestedCents: 6000,
    aliases: ['vivo', 'claro', 'tim', 'oi'],
  },
  {
    id: 'internet',
    common: true,
    name: 'Internet de casa',
    emoji: '🛜',
    group: 'telecom',
    suggestedCents: 11000,
    aliases: ['banda larga', 'fibra'],
  },
  {
    id: 'tv-cabo',
    name: 'TV por assinatura',
    emoji: '📻',
    group: 'telecom',
    suggestedCents: 9000,
  },

  // ---------------------------------------------------------------- casa
  {
    id: 'mercado',
    common: true,
    name: 'Mercado',
    emoji: '🛒',
    group: 'home',
    suggestedCents: 70000,
    aliases: ['supermercado', 'feira', 'compras'],
  },
  {
    id: 'aluguel',
    common: true,
    name: 'Aluguel',
    emoji: '🔑',
    group: 'home',
    suggestedCents: 150000,
  },
  {
    id: 'condominio',
    name: 'Condomínio',
    emoji: '🏢',
    group: 'home',
    suggestedCents: 45000,
  },
  {
    id: 'luz',
    common: true,
    name: 'Luz',
    emoji: '💡',
    group: 'home',
    suggestedCents: 15000,
    aliases: ['energia', 'enel', 'cemig'],
  },
  {
    id: 'agua',
    name: 'Água',
    emoji: '💧',
    group: 'home',
    suggestedCents: 8000,
    aliases: ['sabesp', 'saneamento'],
  },
  {
    id: 'gas',
    name: 'Gás',
    emoji: '🔥',
    group: 'home',
    suggestedCents: 12000,
    aliases: ['comgas', 'botijão'],
  },
  {
    id: 'iptu',
    name: 'IPTU',
    emoji: '🏛️',
    group: 'home',
    suggestedCents: 20000,
  },
  {
    id: 'faxina',
    name: 'Faxina',
    emoji: '🧹',
    group: 'home',
    suggestedCents: 40000,
    aliases: ['diarista', 'limpeza'],
  },
  {
    id: 'icloud',
    name: 'iCloud',
    emoji: '☁️',
    group: 'home',
    suggestedCents: 1090,
    aliases: ['armazenamento'],
  },
  {
    id: 'google-one',
    name: 'Google One',
    emoji: '🗄️',
    group: 'home',
    suggestedCents: 999,
    aliases: ['drive', 'armazenamento'],
  },

  // ---------------------------------------------------------- transporte
  {
    id: 'seguro-carro',
    common: true,
    name: 'Seguro do carro',
    emoji: '🛡️',
    group: 'transport',
    suggestedCents: 25000,
    aliases: ['seguro auto', 'seguro veicular'],
  },
  {
    id: 'ipva',
    name: 'IPVA',
    emoji: '🚙',
    group: 'transport',
    suggestedCents: 90000,
    aliases: ['licenciamento'],
  },
  {
    id: 'financiamento-carro',
    name: 'Financiamento do carro',
    emoji: '🚗',
    group: 'transport',
    suggestedCents: 90000,
    aliases: ['parcela do carro'],
  },
  {
    id: 'combustivel',
    name: 'Combustível',
    emoji: '⛽',
    group: 'transport',
    suggestedCents: 40000,
    aliases: ['gasolina', 'etanol'],
  },
  {
    id: 'estacionamento',
    name: 'Estacionamento',
    emoji: '🅿️',
    group: 'transport',
    suggestedCents: 25000,
    aliases: ['garagem'],
  },
  {
    id: 'transporte-publico',
    common: true,
    name: 'Transporte público',
    emoji: '🚌',
    group: 'transport',
    suggestedCents: 25000,
    aliases: ['ônibus', 'metrô', 'bilhete'],
  },

  // ---------------------------------------------------------------- saúde
  {
    id: 'plano-saude',
    common: true,
    name: 'Plano de saúde',
    emoji: '🏥',
    group: 'health',
    suggestedCents: 45000,
    aliases: ['convênio', 'unimed', 'amil'],
  },
  {
    id: 'academia',
    common: true,
    name: 'Academia',
    emoji: '🏋️',
    group: 'health',
    suggestedCents: 12000,
    aliases: ['smartfit', 'gym'],
  },
  {
    id: 'plano-odonto',
    name: 'Plano odontológico',
    emoji: '🦷',
    group: 'health',
    suggestedCents: 8000,
    aliases: ['dentista'],
  },
  {
    id: 'terapia',
    name: 'Terapia',
    emoji: '🧠',
    group: 'health',
    suggestedCents: 60000,
    aliases: ['psicólogo', 'psicologia'],
  },
  {
    id: 'farmacia',
    name: 'Remédios',
    emoji: '💊',
    group: 'health',
    suggestedCents: 15000,
    aliases: ['farmácia', 'medicamento'],
  },

  // ------------------------------------------------------------- educação
  {
    id: 'faculdade',
    name: 'Faculdade',
    emoji: '🎓',
    group: 'education',
    suggestedCents: 80000,
    aliases: ['mensalidade', 'universidade'],
  },
  {
    id: 'curso',
    name: 'Curso',
    emoji: '📖',
    group: 'education',
    suggestedCents: 15000,
    aliases: ['inglês', 'idiomas'],
  },
  {
    id: 'escola-filhos',
    name: 'Escola',
    emoji: '🎒',
    group: 'education',
    suggestedCents: 90000,
    aliases: ['colégio', 'creche'],
  },

  // ------------------------------------------------------------ financeiro
  {
    id: 'cartao',
    common: true,
    name: 'Fatura do cartão',
    emoji: '💳',
    group: 'finance',
    suggestedCents: 80000,
  },
  {
    id: 'emprestimo',
    name: 'Empréstimo',
    emoji: '🏦',
    group: 'finance',
    suggestedCents: 50000,
    aliases: ['consignado', 'parcela'],
  },
  {
    id: 'seguro-vida',
    name: 'Seguro de vida',
    emoji: '🛟',
    group: 'finance',
    suggestedCents: 8000,
  },
]

/** Normaliza para busca: minúsculas, sem acento. */
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

/**
 * Busca por nome ou apelido.
 *
 * Os apelidos existem porque as pessoas digitam o nome popular, não o oficial:
 * quem procura "hbo" quer o Max, quem digita "vivo" quer o plano de celular.
 */
export function searchCatalog(query: string): readonly CatalogItem[] {
  const term = normalize(query)
  if (term === '') return CATALOG

  return CATALOG.filter((item) => {
    if (normalize(item.name).includes(term)) return true
    return (item.aliases ?? []).some((alias) => normalize(alias).includes(term))
  })
}

export function groupCatalog(
  items: readonly CatalogItem[],
): [CatalogGroup, CatalogItem[]][] {
  const byGroup = new Map<CatalogGroup, CatalogItem[]>()

  for (const item of items) {
    const bucket = byGroup.get(item.group)
    if (bucket) bucket.push(item)
    else byGroup.set(item.group, [item])
  }

  const order = Object.keys(CATALOG_GROUPS) as CatalogGroup[]
  return order
    .filter((group) => byGroup.has(group))
    .map((group) => [group, byGroup.get(group) ?? []])
}

/** Os itens da lista curta do onboarding, na ordem em que aparecem. */
export const COMMON_CATALOG: readonly CatalogItem[] = CATALOG.filter(
  (item) => item.common === true,
)

export const findCatalogItem = (id: string): CatalogItem | undefined =>
  CATALOG.find((item) => item.id === id)
