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
