-- Adicionar campo vercelConfigured à tabela CustomDomain

ALTER TABLE "CustomDomain" 
ADD COLUMN "vercelConfigured" BOOLEAN NOT NULL DEFAULT false;

-- Atualizar domínios existentes como não configurados
UPDATE "CustomDomain" 
SET "vercelConfigured" = false 
WHERE "vercelConfigured" IS NULL;
