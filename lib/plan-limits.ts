// /lib/plan-limits.ts
export const PLAN_LIMITS = {
  1: { // FREE
    name: 'Free',
    campaigns: 1,
    webhooks: 1,
    customDomains: 0,
    variations: 2,
    views: Infinity,
    dataRetentionDays: 30, // ✅ Retenção de 30 dias
    upgradeMessage: 'Faça upgrade para o plano Starter para adicionar mais'
  },
  2: { // STARTER
    name: 'Starter',
    campaigns: 3,
    webhooks: 2,
    customDomains: 1,
    variations: 2,
    views: Infinity,
    dataRetentionDays: 90, // ✅ Retenção de 90 dias
    upgradeMessage: 'Faça upgrade para o plano Pro para adicionar mais'
  },
  3: { // PRO
    name: 'Pro',
    campaigns: 10,
    webhooks: 5,
    customDomains: 3,
    variations: 3,
    views: Infinity,
    dataRetentionDays: 180, // ✅ Retenção de 180 dias
    upgradeMessage: 'Entre em contato com o suporte para um plano personalizado'
  }
};

export type PlanId = keyof typeof PLAN_LIMITS;

// ✅ CONVERTER NOME DO PLANO (string) PARA ID (number)
export function planNameToId(planName: string): number {
  const normalized = planName.toLowerCase();
  switch (normalized) {
    case 'free': return 1;
    case 'starter': return 2;
    case 'pro': return 3;
    default: return 1; // Default para FREE
  }
}

export function getPlanLimits(planId: number) {
  return PLAN_LIMITS[planId as PlanId] || PLAN_LIMITS[1];
}

// ✅ NOVA: Aceita string ou number
export function getPlanLimitsByName(plan: string | number) {
  const planId = typeof plan === 'string' ? planNameToId(plan) : plan;
  return getPlanLimits(planId);
}

export function canAddCampaign(planId: number, currentCount: number): boolean {
  const limits = getPlanLimits(planId);
  return currentCount < limits.campaigns;
}

export function canAddWebhook(planId: number, currentCount: number): boolean {
  const limits = getPlanLimits(planId);
  return currentCount < limits.webhooks;
}

export function canAddCustomDomain(planId: number, currentCount: number): boolean {
  const limits = getPlanLimits(planId);
  return currentCount < limits.customDomains;
}

export function getUpgradeMessage(planId: number): string {
  const limits = getPlanLimits(planId);
  return limits.upgradeMessage;
}
