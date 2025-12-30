-- Adicionar campo vercelDnsTarget à tabela CustomDomain

ALTER TABLE "CustomDomain" 
ADD COLUMN "vercelDnsTarget" TEXT;

-- Atualizar domínios existentes com valor fallback
UPDATE "CustomDomain" 
SET "vercelDnsTarget" = 'cname.vercel-dns.com' 
WHERE "vercelDnsTarget" IS NULL;
