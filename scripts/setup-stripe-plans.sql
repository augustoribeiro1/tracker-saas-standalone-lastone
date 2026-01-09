-- Script para configurar os planos do Stripe no banco de dados
-- Execute este script no seu banco PostgreSQL (Neon)

-- Deletar planos existentes (se houver)
DELETE FROM "Subscription";
DELETE FROM "Plan";

-- Inserir planos
-- IMPORTANTE: Substitua os PRICE_IDs pelos que você criar no Stripe

-- Plano FREE (não tem Stripe, é gratuito)
INSERT INTO "Plan" (id, name, "displayName", "maxCampaigns", "maxVariations", "maxClicks", "maxDomains", features, "monthlyPrice", "yearlyPrice", currency, active, popular, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'free',
  'Free',
  1,
  2,
  1000,
  0,
  'tracking_basico,analytics_simples',
  0,
  0,
  'BRL',
  true,
  false,
  NOW(),
  NOW()
);

-- Plano STARTER
-- Você precisa criar os PRICES no Stripe e substituir abaixo
INSERT INTO "Plan" (id, name, "displayName", "maxCampaigns", "maxVariations", "maxClicks", "maxDomains", features, "monthlyPrice", "yearlyPrice", "stripeProductId", "stripePriceIdMonthly", "stripePriceIdYearly", currency, active, popular, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'starter',
  'Starter',
  3,
  2,
  999999,
  1,
  'tracking_basico,analytics_avancado,webhooks_2,dominio_custom_1',
  97,  -- R$ 97/mês
  970, -- R$ 970/ano (equivalente a ~R$ 80.83/mês)
  'prod_TlKgGXZyTRs2k8',  -- Product ID do Stripe
  'SUBSTITUA_PELO_PRICE_ID_MENSAL_STARTER',  -- ⚠️ SUBSTITUIR
  'SUBSTITUA_PELO_PRICE_ID_ANUAL_STARTER',   -- ⚠️ SUBSTITUIR
  'BRL',
  true,
  true,  -- Marcar como popular
  NOW(),
  NOW()
);

-- Plano PRO
INSERT INTO "Plan" (id, name, "displayName", "maxCampaigns", "maxVariations", "maxClicks", "maxDomains", features, "monthlyPrice", "yearlyPrice", "stripeProductId", "stripePriceIdMonthly", "stripePriceIdYearly", currency, active, popular, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'pro',
  'Pro',
  10,
  3,
  999999,
  3,
  'tracking_completo,analytics_premium,webhooks_5,dominios_custom_3,suporte_prioritario',
  197,  -- R$ 197/mês
  1970, -- R$ 1970/ano (equivalente a ~R$ 164.17/mês)
  'prod_TlKhFlnvjShnJm',  -- Product ID do Stripe
  'SUBSTITUA_PELO_PRICE_ID_MENSAL_PRO',  -- ⚠️ SUBSTITUIR
  'SUBSTITUA_PELO_PRICE_ID_ANUAL_PRO',   -- ⚠️ SUBSTITUIR
  'BRL',
  true,
  false,
  NOW(),
  NOW()
);

-- Verificar planos criados
SELECT id, name, "displayName", "monthlyPrice", "yearlyPrice", "stripeProductId", "stripePriceIdMonthly", "stripePriceIdYearly"
FROM "Plan"
ORDER BY "monthlyPrice";
