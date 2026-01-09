-- ============================================
-- SCRIPT DE CONFIGURAÇÃO DOS PLANOS STRIPE
-- Execute no Neon SQL Editor
-- ============================================

-- 1. Limpar planos e assinaturas existentes (CUIDADO!)
DELETE FROM "Subscription";
DELETE FROM "Plan";

-- 2. Inserir os 3 planos

-- PLANO FREE (não tem Stripe)
INSERT INTO "Plan" (
  id,
  name,
  "displayName",
  "maxCampaigns",
  "maxVariations",
  "maxClicks",
  "maxDomains",
  features,
  "monthlyPrice",
  "yearlyPrice",
  currency,
  active,
  popular,
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'free',
  'Free',
  1,
  2,
  999999,
  0,
  '1 campanha,2 variações,Webhooks limitados',
  0,
  0,
  'BRL',
  true,
  false,
  NOW(),
  NOW()
);

-- PLANO STARTER
INSERT INTO "Plan" (
  id,
  name,
  "displayName",
  "maxCampaigns",
  "maxVariations",
  "maxClicks",
  "maxDomains",
  features,
  "monthlyPrice",
  "yearlyPrice",
  "stripeProductId",
  "stripePriceIdMonthly",
  currency,
  active,
  popular,
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'starter',
  'Starter',
  3,
  2,
  999999,
  1,
  '3 campanhas,2 webhooks,1 domínio custom,Retenção 90 dias',
  97,
  0,
  'prod_TlKgGXZyTRs2k8',
  'price_1Sno1XDsvoAmqjyaGfH9BwGu',
  'BRL',
  true,
  true,
  NOW(),
  NOW()
);

-- PLANO PRO
INSERT INTO "Plan" (
  id,
  name,
  "displayName",
  "maxCampaigns",
  "maxVariations",
  "maxClicks",
  "maxDomains",
  features,
  "monthlyPrice",
  "yearlyPrice",
  "stripeProductId",
  "stripePriceIdMonthly",
  currency,
  active,
  popular,
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'pro',
  'Pro',
  10,
  3,
  999999,
  3,
  '10 campanhas,5 webhooks,3 domínios custom,3 variações,Retenção 180 dias',
  247,
  0,
  'prod_TlKhFlnvjShnJm',
  'price_1Sno21DsvoAmqjyaZfulcf8A',
  'BRL',
  true,
  false,
  NOW(),
  NOW()
);

-- 3. Verificar os planos criados
SELECT
  name,
  "displayName",
  "monthlyPrice",
  "stripeProductId",
  "stripePriceIdMonthly",
  "maxCampaigns",
  "maxVariations",
  "maxDomains",
  active
FROM "Plan"
ORDER BY "monthlyPrice";
