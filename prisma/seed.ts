import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Criar planos padrão
  const plans = [
    {
      name: 'free',
      displayName: 'Plano Free',
      maxCampaigns: 2,
      maxVariations: 2,
      maxClicks: 1000,
      maxDomains: 0,
      features: JSON.stringify([
        '2 campanhas',
        '2 variações por teste',
        '1.000 clicks/mês',
        'Analytics básico'
      ]),
      monthlyPrice: 0,
      yearlyPrice: 0,
      currency: 'BRL',
      active: true,
      popular: false,
    },
    {
      name: 'starter',
      displayName: 'Plano Starter',
      maxCampaigns: 10,
      maxVariations: 5,
      maxClicks: 10000,
      maxDomains: 1,
      features: JSON.stringify([
        '10 campanhas',
        '5 variações por teste',
        '10.000 clicks/mês',
        '1 domínio customizado',
        'Webhooks ilimitados',
        'Analytics avançado'
      ]),
      monthlyPrice: 47,
      yearlyPrice: 470, // 10 meses
      currency: 'BRL',
      active: true,
      popular: true,
    },
    {
      name: 'pro',
      displayName: 'Plano Pro',
      maxCampaigns: 50,
      maxVariations: 10,
      maxClicks: 100000,
      maxDomains: 5,
      features: JSON.stringify([
        '50 campanhas',
        '10 variações por teste',
        '100.000 clicks/mês',
        '5 domínios customizados',
        'Webhooks ilimitados',
        'Analytics avançado',
        'Suporte prioritário',
        'API access'
      ]),
      monthlyPrice: 147,
      yearlyPrice: 1470, // 10 meses
      currency: 'BRL',
      active: true,
      popular: false,
    },
    {
      name: 'agency',
      displayName: 'Plano Agency',
      maxCampaigns: 200,
      maxVariations: 20,
      maxClicks: 500000,
      maxDomains: 20,
      features: JSON.stringify([
        '200 campanhas',
        '20 variações por teste',
        '500.000 clicks/mês',
        '20 domínios customizados',
        'Webhooks ilimitados',
        'Analytics avançado',
        'Suporte prioritário',
        'API access',
        'White label',
        'Multi-user'
      ]),
      monthlyPrice: 397,
      yearlyPrice: 3970, // 10 meses
      currency: 'BRL',
      active: true,
      popular: false,
    }
  ];

  for (const plan of plans) {
    const existing = await prisma.plan.findUnique({
      where: { name: plan.name }
    });

    if (existing) {
      console.log(`⏭️  Plano ${plan.name} já existe, pulando...`);
      continue;
    }

    await prisma.plan.create({ data: plan });
    console.log(`✅ Plano ${plan.name} criado`);
  }

  console.log('✨ Seed completo!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
