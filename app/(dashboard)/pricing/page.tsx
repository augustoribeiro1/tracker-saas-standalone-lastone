'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

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
    <div className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">Escolha Seu Plano</h1>
        <p className="mt-4 text-lg text-gray-600">
          Escale seu negócio com as ferramentas certas
        </p>
      </div>

      {loading ? (
        <div className="text-center">Carregando planos...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto px-4 sm:px-0">
            {plans.map((plan) => {
              const price = parseFloat(plan.monthlyPrice);

              const features = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]');
              const isCurrent = currentPlan === plan.name;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 ${
                    plan.popular
                      ? 'border-blue-500 shadow-xl'
                      : 'border-gray-200'
                  } bg-white p-6 sm:p-8 ${plan.popular ? 'lg:scale-105' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex rounded-full bg-blue-500 px-4 py-1 text-sm font-semibold text-white">
                        Mais Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900">{plan.displayName}</h3>
                    <div className="mt-4 flex items-baseline justify-center gap-x-2">
                      <span className="text-5xl font-bold tracking-tight text-gray-900">
                        {formatCurrency(price)}
                      </span>
                      <span className="text-sm font-semibold leading-6 tracking-wide text-gray-600">
                        /mês
                      </span>
                    </div>
                  </div>

                  <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
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
                </div>
              );
            })}
          </div>

          {/* Plano Personalizado */}
          <div className="mt-12 max-w-6xl mx-auto px-4 sm:px-0">
            <div className="rounded-2xl border-2 border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 p-8 shadow-lg">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">Plano Personalizado</h3>
                <p className="mt-4 text-lg text-gray-600">
                  Precisa de um plano maior? Fale com nossa equipe
                </p>
                <div className="mt-8">
                  <a href="https://split2.com.br/contato" target="_blank" rel="noopener noreferrer">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg">
                      Fale com um Consultor
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Customer Portal */}
      {currentPlan !== 'free' && (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 mb-4">
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
