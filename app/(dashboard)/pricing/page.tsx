'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

// ✅ Features estáticas dos planos (editáveis diretamente aqui)
const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    'Webhooks limitados',
    'Analytics básico',
    'Suporte por email'
  ],
  starter: [
    'Webhooks ilimitados',
    'Analytics avançado',
    '1 domínio customizado',
    'Retenção de dados: 90 dias',
    'Suporte prioritário'
  ],
  pro: [
    'Webhooks ilimitados',
    'Analytics completo',
    '3 domínios customizados',
    'Retenção de dados: 180 dias',
    'Suporte prioritário',
    'API dedicada'
  ]
};

export default function PricingPage() {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const res = await fetch('/api/plans');
    const data = await res.json();
    setPlans(data.plans || []);
    setLoading(false);
  };

  const handleUpgrade = async (planId: string) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, interval: 'monthly' })
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    }
  };

  const currentPlan = session?.user?.plan || 'free';

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold">Escolha Seu Plano</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Escale seu negócio com as ferramentas certas
        </p>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Carregando planos...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const price = parseFloat(plan.monthlyPrice);

              // ✅ Usar features estáticas do objeto PLAN_FEATURES
              const features = PLAN_FEATURES[plan.name] || [];
              const isCurrent = currentPlan === plan.name;

              return (
                <Card
                  key={plan.id}
                  className={`relative ${
                    plan.popular
                      ? 'border-primary shadow-xl lg:scale-105'
                      : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="px-4 py-1">
                        Mais Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
                    <div className="mt-4 flex items-baseline justify-center gap-x-2">
                      <span className="text-5xl font-bold tracking-tight">
                        {formatCurrency(price)}
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        /mês
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 text-sm leading-6">
                    <li className="flex gap-x-3">
                      <span className="font-semibold">✓ {plan.maxCampaigns} campanhas</span>
                    </li>
                    <li className="flex gap-x-3">
                      <span className="font-semibold">✓ {plan.maxVariations} variações</span>
                    </li>
                    <li className="flex gap-x-3">
                      <span className="font-semibold">✓ {plan.maxClicks.toLocaleString()} clicks/mês</span>
                    </li>
                    {plan.maxDomains > 0 && (
                      <li className="flex gap-x-3">
                        <span className="font-semibold">✓ {plan.maxDomains} domínios customizados</span>
                      </li>
                    )}
                    {features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex gap-x-3">
                        <span>✓ {feature}</span>
                      </li>
                    ))}
                    </ul>

                    <div className="mt-8">
                      {isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          Plano Atual
                        </Button>
                      ) : plan.name === 'free' ? (
                        <Button variant="outline" className="w-full" disabled>
                          Plano Gratuito
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleUpgrade(plan.id)}
                          className="w-full"
                          variant={plan.popular ? 'default' : 'outline'}
                        >
                          Assinar Agora
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Plano Personalizado */}
          <div className="mt-12 max-w-6xl mx-auto">
            <Card className="border-2 border-purple-500 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold">Plano Personalizado</h3>
                <p className="mt-4 text-lg text-muted-foreground">
                  Precisa de um plano maior? Fale com nossa equipe
                </p>
                <div className="mt-8">
                  <a href="https://split2.com.br/contato" target="_blank" rel="noopener noreferrer">
                    <Button className="px-8 py-3 text-lg">
                      Fale com um Consultor
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Customer Portal */}
      {currentPlan !== 'free' && (
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Já é assinante? Gerencie sua assinatura
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              const res = await fetch('/api/stripe/portal', { method: 'POST' });
              const data = await res.json();
              if (data.url) window.location.href = data.url;
            }}
          >
            Gerenciar Assinatura
          </Button>
        </div>
      )}
    </div>
  );
}
