'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export default function PricingPage() {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const res = await fetch('/api/plans');
    const data = await res.json();
    setPlans(data.plans || []);
    setLoading(false);
  };

  const handleUpgrade = async (planId: string, interval: string) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, interval })
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

        {/* Toggle Mensal/Anual */}
        <div className="mt-8 flex justify-center items-center gap-4">
          <span className={billingInterval === 'monthly' ? 'font-semibold' : 'text-gray-500'}>
            Mensal
          </span>
          <button
            onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              billingInterval === 'yearly' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <span className={billingInterval === 'yearly' ? 'font-semibold' : 'text-gray-500'}>
            Anual
            <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Economize 17%
            </span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center">Carregando planos...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto px-4 sm:px-0">
          {plans.map((plan) => {
            const price = billingInterval === 'monthly' 
              ? parseFloat(plan.monthlyPrice) 
              : parseFloat(plan.yearlyPrice);
            
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
                      /{billingInterval === 'monthly' ? 'mês' : 'ano'}
                    </span>
                  </div>
                  {billingInterval === 'yearly' && plan.name !== 'free' && (
                    <p className="mt-2 text-sm text-gray-500">
                      ou {formatCurrency(price / 12)}/mês
                    </p>
                  )}
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
                      onClick={() => handleUpgrade(plan.id, billingInterval)}
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
