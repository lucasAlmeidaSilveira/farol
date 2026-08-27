/**
 * O que o Farol promete em público, num arquivo só.
 *
 * ESTA É A FONTE DE VERDADE DA LANDING. Os componentes em
 * `src/components/landing/` são apresentação pura e não sabem nada sobre o
 * produto — quem sabe é este arquivo. Mudou o que o app FAZ? Muda aqui, e a
 * página inteira acompanha.
 *
 * Por que conteúdo separado de componente, num projeto que não usa CMS: a
 * landing envelhece de um jeito diferente do resto do código. Ela não quebra
 * quando fica desatualizada — ela só passa a mentir, em silêncio, para quem
 * ainda não é usuário. Concentrar o texto num módulo tipado torna a defasagem
 * visível num diff pequeno, e permite que um teste cheque o que dá para checar.
 *
 * A régua de honestidade é fixa: **só entra aqui o que o app já faz hoje**.
 * Nada de depoimento inventado, número de usuários, selo ou "mais de X mil
 * pessoas". O público-alvo já foi decepcionado por app de finanças antes; a
 * primeira promessa quebrada custa a instalação inteira.
 *
 * O TOM, em quatro regras que valem para cada frase daqui:
 *
 * 1. **Concreto vence abstrato.** "Decidir um jantar de R$ 80 no dia 23" diz
 *    mais que "ter controle financeiro". Cena, valor e data fazem a pessoa se
 *    ver; substantivo abstrato passa reto.
 * 2. **Verbo no presente, segunda pessoa.** É uma conversa, não um folheto.
 * 3. **Nenhum adjetivo de marketing.** Sem "revolucionário", "poderoso",
 *    "inteligente". Quem não sabe quanto pode gastar não quer transformação,
 *    quer um número.
 * 4. **Nunca envergonhe.** A dor é da ferramenta, nunca da pessoa. É a mesma
 *    decisão que trocou o vermelho por terracota na paleta: vergonha fecha a
 *    aba.
 *
 * Detalhes de estrutura e da psicologia por trás de cada seção estão em
 * `.claude/skills/landing-farol/SKILL.md`.
 */

export type LandingCta = {
  label: string
  href: string
}

/** Chaves de ícone. O mapa para os componentes do lucide vive na UI, tipado
 *  como `Record<FeatureIcon, LucideIcon>` — o TypeScript reprova quem
 *  adicionar uma chave aqui e esquecer do desenho lá. */
export type FeatureIcon =
  | 'beacon'
  | 'pace'
  | 'proportional'
  | 'income'
  | 'due'
  | 'impact'
  | 'offline'
  | 'theme'
  | 'privacy'

/** Peças reais do app que a landing sabe renderizar. Adicionar uma chave aqui
 *  obriga o componente de histórias a desenhá-la — o TypeScript cobra. */
export type FeatureDemo = 'commitment' | 'due' | 'income' | 'pace'

export type Feature = {
  id: string
  icon: FeatureIcon
  title: string
  body: string
  /**
   * Quando presente, a funcionalidade ganha uma faixa própria na página, com
   * o componente de verdade do app ao lado do texto — em vez de uma célula na
   * grade. Reserve para as três que só convencem quando vistas funcionando.
   */
  demo?: FeatureDemo
}

export type TourScreen = {
  /** Rota real do app. Um teste garante que toda tela da navegação apareça
   *  aqui — rota nova sem lugar na landing reprova. */
  href: string
  name: string
  headline: string
  points: readonly string[]
}

export type FaqItem = {
  question: string
  answer: string
}

/* ------------------------------------------------------------------ hero */

/**
 * A promessa, em forma de pergunta.
 *
 * É a pergunta que a pessoa já faz sozinha, com as palavras dela — e ler o
 * próprio pensamento escrito na tela é o que separa "mais um app de finanças"
 * de "isto é sobre mim".
 *
 * A subida do texto é deliberada: pergunta (você se reconhece), resposta (um
 * número), mecanismo (ele já descontou o que tem dono). Inverter essa ordem
 * transforma promessa em explicação, e explicação ninguém lê na dobra.
 */
export const HERO = {
  eyebrow: 'Clareza sobre o seu dinheiro',
  title: 'Quanto você pode gastar até o fim do mês?',
  lead: 'Um número responde. Ele já tirou o que tem dono — contas fixas, compromissos, o que você já gastou — e se refaz sozinho quando o mês muda de ideia.',
  primary: { label: 'Descobrir meu número', href: '/entrar' },
  secondary: { label: 'Ver como funciona', href: '#como-funciona' },
  /** Os três medos que travam o clique, respondidos antes de ele acontecer. */
  reassurances: [
    'Pronto em 2 minutos',
    'Sem conectar banco',
    'Sem cartão, sem senha',
  ],
} as const

/**
 * O exemplo vivo que aparece no lugar do print do app.
 *
 * Mostrar o RESULTADO antes do cadastro é o argumento mais forte que a página
 * tem: a pessoa vê a resposta que quer e o login vira o caminho até ela, em vez
 * de um pedágio antes de saber se vale a pena.
 *
 * Os números NÃO estão aqui — vêm de `src/content/demo-month.ts`, calculados
 * pela engine de verdade. Aqui ficam só as palavras ao redor deles. Um exemplo
 * escrito à mão envelhece na primeira mudança de regra, e "quase certo" num app
 * de dinheiro é errado.
 */
export const PREVIEW = {
  /** A renda que chega no meio do mês, na simulação de impacto. */
  impactLabel: 'Caiu um freela',
  commitmentLabel: 'Já tem dono',
  freeLabel: 'Sobra pra você',
  note: 'Exemplo calculado agora, pela mesma engine que roda o app. O seu número sai do seu plano.',
} as const

/* ---------------------------------------------------- cabeçalhos de seção */

/**
 * O título e a linha de apoio de cada seção.
 *
 * Ficam aqui, e não no componente, pela regra que vale para a landing inteira:
 * se foi preciso abrir um componente para mudar uma palavra, a palavra estava
 * no lugar errado. Reunidos, também dá para LER a página inteira de cima a
 * baixo neste arquivo e perceber quando dois títulos prometem a mesma coisa.
 */
export const SECTIONS = {
  steps: {
    eyebrow: 'Como funciona',
    title: 'Três passos, e o terceiro é opcional',
    lead: 'Nenhuma pergunta exige valor exato. Uma faixa aproximada agora vale mais que um número perfeito que você não sabe responder.',
  },
  stories: {
    eyebrow: 'O que ele faz',
    title: 'Pensado para quem não recebe igual todo mês',
    lead: 'As peças abaixo não são imagem: são os componentes do app, rodando aqui, com um mês de exemplo calculado pela mesma engine — datas deste mês incluídas.',
  },
  features: {
    eyebrow: 'Também vem junto',
    title: 'O resto que aparece no dia a dia',
    lead: 'Cada item aqui já existe no app. Nada é promessa de versão futura.',
  },
  tour: {
    eyebrow: 'Por dentro',
    title: 'Quatro telas. Nenhuma planilha.',
    lead: 'O app inteiro cabe numa barra com quatro itens. Se você precisar de um tutorial, ele falhou.',
  },
  faq: {
    eyebrow: 'Dúvidas',
    title: 'O que costuma travar antes de começar',
  },
} as const

/** Rótulos das bordas da página. */
export const CHROME = {
  signIn: 'Entrar',
  rights: 'Farol · Todos os direitos reservados.',
  navLabel: 'Seções da página',
} as const

/* ------------------------------------------------------------------ dor */

/**
 * O problema, dito sem culpar quem lê.
 *
 * A tentação aqui é o clássico "você está perdendo dinheiro sem perceber".
 * Não neste produto: o público-alvo já se sente mal com dinheiro, e vergonha
 * fecha a aba. Cada item nomeia uma cena reconhecível e coloca a culpa na
 * ferramenta — nunca na pessoa.
 */
export const PAIN = {
  eyebrow: 'Por que a conta não fecha',
  title: 'O problema nunca foi falta de disciplina',
  items: [
    {
      title: 'O salário entra e some',
      body: 'Você sabe quanto caiu na conta. O que ninguém sabe é quanto daquilo já tinha dono antes do dia 10.',
    },
    {
      title: 'Todo gasto vira uma dúvida',
      body: 'Do dia 20 em diante, decidir um jantar de R$ 80 exige uma conta de cabeça que nunca fecha. Aí você decide no escuro.',
    },
    {
      title: 'A planilha cobra antes de responder',
      body: 'App de lançamento pede três semanas de disciplina para devolver o primeiro número. Quem mais precisa de resposta desiste na segunda.',
    },
  ],
  close:
    'O Farol começa pelo fim: primeiro o número, depois — só se você quiser — os detalhes.',
} as const

/* --------------------------------------------------------- como funciona */

/**
 * Como funciona, com o custo de cada passo declarado.
 *
 * A objeção real nunca é "será que funciona" — é "quanto trabalho isso vai me
 * dar". Passo que não anuncia o próprio custo é passo que a pessoa assume ser
 * caro, e três passos silenciosos parecem um fim de semana perdido.
 *
 * Por isso cada um carrega uma etiqueta de esforço, e o terceiro diz que é
 * opcional em voz alta: é literalmente a promessa do produto — ele responde no
 * primeiro minuto, com zero lançamentos.
 */
export const STEPS = [
  {
    title: 'Responda quatro perguntas',
    body: 'Quanto costuma cair na sua conta, o que sai antes de tudo, quais contas se repetem todo mês. Você toca numa faixa: ninguém digita centavo aqui.',
    effort: '2 minutos',
  },
  {
    title: 'Veja o seu número',
    body: 'A renda menos o que já tem dono, dividida pelos dias que faltam. Grande, no topo, com a conta aberta logo abaixo — dá para conferir de onde ele saiu.',
    effort: 'Na hora',
  },
  {
    title: 'Deixe o mês acontecer',
    body: 'Caiu um freela, chegou um boleto, você gastou no mercado. Dois toques e o número se refaz na sua frente, com o novo ritmo por dia.',
    effort: 'Quando der',
  },
] as const

/* --------------------------------------------------------- funcionalidades */

/**
 * O que o app faz. Uma entrada por funcionalidade real, sem exceção.
 *
 * Vale para os dois lados: funcionalidade que existe e não está aqui é
 * trabalho invisível; entrada aqui sem funcionalidade no app é propaganda
 * enganosa.
 *
 * Cada título é um BENEFÍCIO, não um recurso. "Nenhuma conta te pega de
 * surpresa" vende o mesmo que "lembrete de vencimento" e diz o que a pessoa
 * ganha em vez de o que o programa tem.
 */
export const FEATURES: readonly Feature[] = [
  {
    id: 'beacon',
    icon: 'beacon',
    title: 'Um número manda na tela',
    body: 'Quanto ainda dá para gastar até o fim do mês, com o quanto por dia logo abaixo. É a primeira coisa que você lê ao abrir o app — e quase sempre a única de que precisa.',
  },
  {
    id: 'pace',
    icon: 'pace',
    title: 'O mês fechado antes de fechar',
    body: 'O app compara o que você já gastou com o quanto do mês já passou e diz onde isso termina se o ritmo continuar. Saber no dia 12 que o mês fecha acima do plano ainda dá tempo de mudar; saber no dia 30, não.',
    demo: 'pace',
  },
  {
    id: 'proportional',
    icon: 'proportional',
    title: 'Percentuais que se recalculam',
    body: 'Dízimo, oferta, poupança, comissão: você diz a alíquota e o app cuida do resto. Entrou renda no dia 22? O valor sobe junto — e o rateio entre as parcelas fecha no centavo, com a conta aberta na tela.',
    demo: 'commitment',
  },
  {
    id: 'income',
    icon: 'income',
    title: 'Feito para renda que varia',
    body: 'O previsto vale enquanto o realizado não chega. O freela que você espera aparece na lista, com o rótulo de que ainda não entrou — e conta como zero no seu número. O app se recusa a somar dinheiro que não existe.',
    demo: 'income',
  },
  {
    id: 'due',
    icon: 'due',
    title: 'Nenhuma conta pega você de surpresa',
    body: 'Vencimento por dia do mês ou por dia útil, sempre em ordem de data. O que já foi pago sai da frente, o que atrasou vem primeiro — e você vê o boleto antes de ele vencer, não no e-mail da multa.',
    demo: 'due',
  },
  {
    id: 'impact',
    icon: 'impact',
    title: 'O impacto antes da euforia',
    body: 'Registrou uma renda extra? O app mostra na hora quanto dela já tem dono e quanto sobra de verdade — antes de você contar com o dinheiro todo.',
  },
  {
    id: 'offline',
    icon: 'offline',
    title: 'Funciona até no modo avião',
    body: 'Instale na tela de início e lance offline, na fila do mercado ou no metrô. Sincroniza sozinho quando o sinal volta.',
  },
  {
    id: 'theme',
    icon: 'theme',
    title: 'Legível no sol e na cama',
    body: 'Tema claro, escuro ou o do sistema, com o contraste de cada par de cores calculado — acima do que a norma de acessibilidade exige.',
  },
  {
    id: 'privacy',
    icon: 'privacy',
    title: 'Seus dados não viram produto',
    body: 'Cada pessoa tem um espaço privado, protegido por regras que rodam no servidor. O Farol não vende, não compartilha e não pede acesso ao seu banco.',
  },
]

/* --------------------------------------------------------------- o app */

/**
 * As telas, na ordem em que a pessoa as encontra.
 *
 * Existe para responder "o que eu vou receber depois de entrar" — a incerteza
 * que sobra depois que a promessa já convenceu. Porta fechada é onde a maioria
 * desiste.
 */
export const TOUR: readonly TourScreen[] = [
  {
    href: '/hoje',
    name: 'Hoje',
    headline: 'O número, e tudo que ele já descontou',
    points: [
      'Quanto dá para gastar até o fim do mês, em destaque',
      'O ritmo por dia, para o dinheiro não acabar antes do mês',
      'A divisão aberta: compromisso, conta fixa, gasto e sobra',
    ],
  },
  {
    href: '/plano',
    name: 'Plano',
    headline: 'Onde o seu mês é montado',
    points: [
      'Renda prevista e realizada, fixa ou variável',
      'Compromissos por percentual, parcelas e contas fixas',
      'A sobra recalcula a cada edição, no rodapé da tela',
    ],
  },
  {
    href: '/mes',
    name: 'Mês',
    headline: 'A história do mês, do dia 1 ao último',
    points: [
      'Linha do tempo com o que aconteceu e o que ainda vem',
      'Nunca fica em branco: o previsto aparece antes de acontecer',
      'Lançamentos e quitações no mesmo lugar, por dia',
    ],
  },
  {
    href: '/ajustes',
    name: 'Ajustes',
    headline: 'O app no seu ritmo',
    points: [
      'Seu mês pode começar no dia do salário, não no dia 1',
      'Tema claro, escuro ou o do sistema',
      'Conta e espaço financeiro num lugar só',
    ],
  },
]

/* ----------------------------------------------------------------- dúvidas */

/**
 * As objeções, na ordem em que aparecem na cabeça de quem hesita.
 *
 * FAQ de landing não é suporte: é o lugar onde o medo que trava o clique é
 * dito com todas as letras e respondido em uma frase. As duas primeiras vêm
 * primeiro porque são as que fazem alguém fechar a aba — e as duas respostas
 * começam com "não".
 */
export const FAQ: readonly FaqItem[] = [
  {
    question: 'Preciso conectar minha conta do banco?',
    answer:
      'Não. O Farol não pede acesso ao banco e não lê extrato. Você diz quanto costuma entrar e o que já tem dono; o resto é conta.',
  },
  {
    question: 'Preciso lançar todo gasto?',
    answer:
      'Não. O número sai do seu plano, então o app já responde com zero lançamentos. Lançar refina a resposta — é refinamento, não obrigação.',
  },
  {
    question: 'E se a minha renda mudar todo mês?',
    answer:
      'Foi para isso que ele foi feito. O previsto vale enquanto o realizado não chega, e o que é percentual se recalcula sobre a renda real do mês, quando ela chega.',
  },
  {
    question: 'Quanto custa?',
    answer:
      'Nada. Não existe plano pago, período de teste nem pedido de cartão.',
  },
  {
    question: 'Meus dados ficam seguros?',
    answer:
      'Cada pessoa tem um espaço próprio, e quem decide quem lê o quê são regras que rodam no servidor do Google — não o código que está no seu navegador.',
  },
  {
    question: 'Funciona no iPhone e no Android?',
    answer:
      'Nos dois, e no computador. É um app instalável: abre no navegador e pode ir para a tela de início como qualquer outro.',
  },
]

/* ------------------------------------------------------------- fechamento */

export const CLOSING = {
  title: 'O seu número já existe. Falta você ver.',
  body: 'Duas perguntas, dois minutos, sem cartão e sem conectar banco. Entre com a conta que você já tem e veja o mês do jeito que ele está.',
  primary: { label: 'Descobrir meu número', href: '/entrar' },
} as const

/** Rótulo do CTA para quem já tem sessão aberta. Mandar "Entrar" para quem já
 *  entrou é o tipo de detalhe que faz o produto parecer desatento. */
export const RETURNING_CTA: LandingCta = {
  label: 'Abrir o Farol',
  href: '/hoje',
}

export const NAV_LINKS = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'O que ele faz', href: '#funcionalidades' },
  { label: 'Dúvidas', href: '#duvidas' },
] as const

export const FOOTER_TAGLINE = 'Clareza sobre o seu dinheiro.'
