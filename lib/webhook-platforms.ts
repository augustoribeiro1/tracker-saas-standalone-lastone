export const WEBHOOK_PLATFORMS = {
  // ✅ PLATAFORMAS EXISTENTES (mantidas)
  kiwify: {
    id: 'kiwify',
    name: 'Kiwify',
    icon: '🥝',
    description: 'Plataforma de vendas digitais',
  },
  hotmart: {
    id: 'hotmart',
    name: 'Hotmart',
    icon: '🔥',
    description: 'Marketplace de produtos digitais',
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    description: 'Gateway de pagamento global',
  },
  eduzz: {
    id: 'eduzz',
    name: 'Eduzz',
    icon: '🛒',
    description: 'Plataforma de vendas e afiliados',
  },
  perfectpay: {
    id: 'perfectpay',
    name: 'Perfect Pay',
    icon: '💰',
    description: 'Checkout de alta conversão',
  },
  braip: {
    id: 'braip',
    name: 'Braip',
    icon: '⚡',
    description: 'Plataforma de infoprodutos',
  },

  // ✅ NOVAS PLATAFORMAS BRASILEIRAS
  monetizze: {
    id: 'monetizze',
    name: 'Monetizze',
    icon: '💸',
    description: 'Plataforma de afiliados e infoprodutos',
  },
  kirvano: {
    id: 'kirvano',
    name: 'Kirvano',
    icon: '🚀',
    description: 'Checkout inteligente para produtos digitais',
  },
  ticto: {
    id: 'ticto',
    name: 'Ticto',
    icon: '⚙️',
    description: 'Plataforma de checkout e pagamentos',
  },
  lastlink: {
    id: 'lastlink',
    name: 'Lastlink',
    icon: '🔗',
    description: 'Links de pagamento e checkout',
  },
  yampi: {
    id: 'yampi',
    name: 'Yampi',
    icon: '🏪',
    description: 'Plataforma de e-commerce',
  },
  payt: {
    id: 'payt',
    name: 'Payt',
    icon: '💵',
    description: 'Gateway de pagamento',
  },
  cartpanda: {
    id: 'cartpanda',
    name: 'Cartpanda',
    icon: '🐼',
    description: 'Checkout e carrinho de compras',
  },
  digitalmanagerguru: {
    id: 'digitalmanagerguru',
    name: 'Digital Manager Guru',
    icon: '📊',
    description: 'Plataforma de gestão de produtos digitais',
  },
  greenn: {
    id: 'greenn',
    name: 'Greenn',
    icon: '🌱',
    description: 'Plataforma de pagamentos recorrentes',
  },
  cakto: {
    id: 'cakto',
    name: 'Cakto',
    icon: '🎯',
    description: 'Checkout e gestão de vendas',
  },

  // ✅ INTEGRAÇÃO UNIVERSAL
  universal: {
    id: 'universal',
    name: 'Integração Universal',
    icon: '🔌',
    description: 'Configure seus parâmetros personalizados na página Minha Conta',
  },
} as const;

export type WebhookPlatformId = keyof typeof WEBHOOK_PLATFORMS;
