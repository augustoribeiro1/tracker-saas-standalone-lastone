// /lib/plan-limits.ts
// Configuração de limites por plano

export const PLAN_LIMITS = {
  1: { // FREE
    name: 'Free',
    campaigns: 1,
    webhooks: 1,
    customDomains: 0,
    variations: 2,
    views: Infinity,
    upgradeMessage: 'Faça upgrade para o plano Starter para adicionar mais'
  },
  2: { // STARTER
    name: 'Starter',
    campaigns: 3,
    webhooks: 3,
    customDomains: 1,
    variations: 2,
    views: Infinity,
    upgradeMessage: 'Faça upgrade para o plano Pro para adicionar mais'
  },
  3: { // PRO
    name: 'Pro',
    campaigns: 10,
    webhooks: 5,
    customDomains: 5,
    variations: 2,
    views: Infinity,
    upgradeMessage: 'Entre em contato com o suporte para um plano personalizado'
  }
};

export type PlanId = keyof typeof PLAN_LIMITS;

export function getPlanLimits(planId: number) {
  return PLAN_LIMITS[planId as PlanId] || PLAN_LIMITS[1];
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
