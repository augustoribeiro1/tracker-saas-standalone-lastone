# 🚀 Split2 - Standalone Version

Versão **standalone simplificada** do Split2 - pronta para deploy no Vercel em 5 minutos!

## ✅ O que tem aqui:

- ✅ Dashboard completo com analytics
- ✅ Sistema de campanhas A/B testing
- ✅ Webhooks multi-plataforma
- ✅ Domínios customizados
- ✅ Stripe integration (checkout + billing)
- ✅ Sistema de planos (Free, Starter, Pro, Agency)
- ✅ Autenticação NextAuth
- ✅ Redirects server-side
- ✅ Tracking completo

## 🚀 Deploy no Vercel (5 minutos)

### 1. Criar Database (Neon)

1. Vercel Dashboard → Storage → Create Database
2. Escolher **Neon** (Serverless Postgres)
3. Database Name: `split2-db`
4. Copiar a **DATABASE_URL**

### 2. Fazer Deploy

1. Push para GitHub
2. Vercel → New Project → Import
3. **Root Directory:** deixe vazio (`.`)
4. **Framework:** Next.js (auto-detecta)
5. Adicionar Environment Variables:

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...  # Mesma URL do Neon
NEXTAUTH_SECRET=<gerar com: openssl rand -base64 32>
NEXTAUTH_URL=https://seu-app.vercel.app
NEXT_PUBLIC_API_URL=https://seu-app.vercel.app

# Stripe (opcional por enquanto)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

6. Clicar **Deploy**

### 3. Criar tabelas e planos

Após primeiro deploy:

```bash
# Local
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

✅ **Pronto! App no ar!**

## 🔧 Desenvolvimento Local

```bash
npm install
npm run dev
```

## 📚 Comandos úteis

```bash
npm run db:generate  # Gerar Prisma Client
npm run db:push      # Criar/atualizar tabelas
npm run db:studio    # Ver banco (GUI)
npm run db:seed      # Criar planos padrão
```

## 💰 Custos

- Vercel Hobby: **Grátis**
- Neon Free: **Grátis** (512MB)
- Total desenvolvimento: **$0**

Produção:
- Vercel Pro: $20/mês (opcional)
- Neon Pro: $20/mês (se passar de 512MB)

## 🆘 Problemas?

**Build error:**
- Verifique se DATABASE_URL está configurado
- Certifique que tem `?pgbouncer=true` (Neon adiciona automático)

**Database não conecta:**
- Copie a URL correta do Neon Dashboard
- Use a mesma URL para DATABASE_URL e DIRECT_URL

**Prisma errors:**
- Rode `npx prisma generate` antes do build
- Rode `npx prisma db push` para criar tabelas

## 📄 Licença

MIT
