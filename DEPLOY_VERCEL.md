# 🚀 DEPLOY NO VERCEL - PASSO A PASSO

## ✅ CHECKLIST PRÉ-DEPLOY:

- [ ] Código no GitHub
- [ ] Conta Vercel criada
- [ ] Conta Neon criada (ou usar Vercel Postgres)

---

## PASSO 1: Criar Database Neon (3 min)

1. **Vercel Dashboard** → **Storage** → **Create Database**
2. Escolher **"Neon"** (Serverless Postgres)
3. Database Name: `split2-db`
4. Region: US East (Ohio) ou mais próxima
5. Clicar **Create**
6. **COPIAR** a DATABASE_URL completa

---

## PASSO 2: Deploy no Vercel (5 min)

### 2.1 Import projeto

1. **Vercel** → **New Project**
2. Import do GitHub: `split2-standalone`
3. Clicar **Import**

### 2.2 Configurar

**IMPORTANTE:**

- **Root Directory:** `.` (deixar vazio ou ponto)
- **Framework Preset:** Next.js
- **Build Command:** (padrão - deixar automático)
- **Output Directory:** (padrão - deixar automático)
- **Install Command:** (padrão - deixar automático)

### 2.3 Environment Variables

Adicionar:

```bash
DATABASE_URL=postgresql://user:pass@host/db
DIRECT_URL=postgresql://user:pass@host/db
NEXTAUTH_SECRET=<gerar com: openssl rand -base64 32>
NEXTAUTH_URL=https://seu-app.vercel.app
NEXT_PUBLIC_API_URL=https://seu-app.vercel.app
```

**Stripe (pode deixar vazio por enquanto):**

```bash
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 2.4 Deploy

Clicar **Deploy** e aguardar ~3-5 minutos.

---

## PASSO 3: Setup Database (5 min)

### 3.1 Local

```bash
# Instalar deps
npm install

# Gerar Prisma Client
npx prisma generate

# Criar tabelas
npx prisma db push

# Criar planos (Free, Starter, Pro, Agency)
npm run db:seed
```

---

## PASSO 4: Testar (2 min)

1. Acessar https://seu-app.vercel.app
2. Clicar "Criar Conta"
3. Preencher dados
4. Entrar no dashboard
5. Criar campanha teste

✅ **FUNCIONANDO!**

---

## 💡 DICAS:

**Gerar NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

Ou:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Ver logs:**

```bash
vercel logs
```

**Redeploy:**

Vercel Dashboard → Deployments → ... → Redeploy

---

## 🆘 TROUBLESHOOTING:

**Erro: Prisma Client not generated**

```bash
# Local:
npx prisma generate

# Ou adicionar no build command:
prisma generate && next build
```

**Erro: DATABASE_URL not found**

- Verifique se adicionou DATABASE_URL nas env vars
- Redeploy após adicionar

**Build timeout**

- Vercel Free tem limite de 45 minutos
- Upgrade para Pro se necessário

**Prisma migration errors**

- Use `npx prisma db push` ao invés de migrations
- Mais rápido e funciona melhor com Neon

---

**Pronto! App 100% no ar! 🎉**
