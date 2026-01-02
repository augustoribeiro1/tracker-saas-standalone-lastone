# ⚡ COMANDOS RÁPIDOS - COPIAR E COLAR

## 📥 **INSTALAÇÃO:**

```powershell
# 1. Ir para pasta do projeto
cd D:\splitter\tracker-saas-standalone-lastone

# 2. Copiar arquivos extraídos para as pastas corretas
# (fazer manualmente via Windows Explorer)

# 3. Verificar se .env tem variáveis Cloudflare
notepad .env

# 4. Rodar Prisma migration (se necessário)
npx prisma db push

# 5. Commit
git add .
git commit -m "Add Cloudflare for SaaS integration - custom hostnames support"
git push

# 6. Aguardar deploy no Vercel (~2 min)
```

---

## 🧪 **TESTAR LOCALMENTE:**

```powershell
# 1. Rodar dev server
npm run dev

# 2. Testar API em outro terminal
# (substituir por dados reais)

# Adicionar domínio:
curl http://localhost:3000/api/domains/add \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"domain\":\"track.teste.com\"}"

# Listar domínios:
curl http://localhost:3000/api/domains/list

# Verificar domínio:
curl "http://localhost:3000/api/domains/verify?domainId=1"

# Deletar domínio:
curl "http://localhost:3000/api/domains/delete?domainId=1" \
  -X DELETE
```

---

## 🔍 **VERIFICAR LOGS:**

```powershell
# Vercel logs (production)
vercel logs

# Vercel logs (tail/follow)
vercel logs --follow

# Logs específicos de função
vercel logs --function api/domains/add
```

---

## 🐛 **DEBUG:**

```powershell
# Verificar variáveis de ambiente no Vercel
vercel env ls

# Pull variáveis do Vercel para local
vercel env pull .env.local

# Verificar build
vercel build

# Deploy de teste
vercel --prod
```

---

## 📊 **VERIFICAR CLOUDFLARE:**

```bash
# Listar Custom Hostnames via API
curl -X GET "https://api.cloudflare.com/client/v4/zones/SEU_ZONE_ID/custom_hostnames" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"

# Verificar status de um hostname específico
curl -X GET "https://api.cloudflare.com/client/v4/zones/SEU_ZONE_ID/custom_hostnames/HOSTNAME_ID" \
  -H "Authorization: Bearer SEU_TOKEN"

# Deletar hostname via API
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/SEU_ZONE_ID/custom_hostnames/HOSTNAME_ID" \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 🔄 **PRISMA:**

```powershell
# Gerar Prisma Client
npx prisma generate

# Criar migration
npx prisma migrate dev --name add_cloudflare_fields

# Push schema (sem migration)
npx prisma db push

# Ver banco de dados
npx prisma studio

# Reset database (cuidado!)
npx prisma migrate reset
```

---

## 📦 **GIT:**

```powershell
# Ver status
git status

# Adicionar tudo
git add .

# Commit
git commit -m "Add Cloudflare for SaaS"

# Push
git push origin main

# Ver log
git log --oneline

# Desfazer último commit (cuidado!)
git reset --soft HEAD~1
```

---

## ⚙️ **VERCEL:**

```powershell
# Login
vercel login

# Link projeto
vercel link

# Deploy
vercel --prod

# Ver deployments
vercel ls

# Ver domínios
vercel domains ls

# Adicionar variável
vercel env add CLOUDFLARE_API_TOKEN

# Remover variável
vercel env rm CLOUDFLARE_API_TOKEN
```

---

## 🎯 **WORKFLOW COMPLETO:**

```powershell
# 1. Desenvolvimento
cd D:\splitter\tracker-saas-standalone-lastone
npm run dev
# (fazer mudanças)

# 2. Testar localmente
curl http://localhost:3000/api/domains/list

# 3. Commit
git add .
git commit -m "Fix: domain validation"
git push

# 4. Verificar deploy
vercel logs --follow

# 5. Testar production
curl https://app.split2.com.br/api/domains/list
```

---

## 📋 **CHECKLIST DE DEPLOY:**

```
□ Extrair arquivos na pasta correta
□ Verificar .env local
□ Verificar Prisma schema
□ Rodar npx prisma db push
□ git add . && git commit && git push
□ Aguardar deploy Vercel
□ Verificar variáveis no Vercel
□ Testar API /domains/list
□ Testar adicionar domínio teste
□ Verificar no Cloudflare Dashboard
□ Configurar DNS teste
□ Verificar status
□ ✅ FUNCIONA!
```

---

**COMANDOS PRONTOS! COPIE E USE! ⚡**
