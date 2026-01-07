// /components/PlanLimitReached.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PlanLimitReachedProps {
  resource: 'campanhas' | 'checkouts' | 'domínios';
  current: number;
  max: number;
  planName: string;
  upgradeMessage: string;
}

export function PlanLimitReached({ 
  resource, 
  current, 
  max, 
  planName,
  upgradeMessage 
}: PlanLimitReachedProps) {
  
  const isPro = planName.toLowerCase() === 'pro';
  
  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Limite do Plano {planName} Atingido
          </h3>
          
          <p className="text-sm text-yellow-700 mb-3">
            Você atingiu o limite de <strong>{max} {resource}</strong> do seu plano atual.
            ({current}/{max} em uso)
          </p>
          
          <p className="text-sm text-yellow-700 mb-4">
            {upgradeMessage}
          </p>
          
          {!isPro && (
            <Link href="/pricing">
              <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                🚀 Fazer Upgrade
              </Button>
            </Link>
          )}
          
          {isPro && (
            <a href="mailto:suporte@split2.com.br?subject=Plano Personalizado">
              <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                📧 Contatar Suporte
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
