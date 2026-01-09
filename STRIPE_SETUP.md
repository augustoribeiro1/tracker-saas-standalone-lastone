# Guia de Configuração do Stripe

## 📋 Informações Fornecidas

**API Key (Live):** *(fornecida separadamente - não commitada por segurança)*

**Produtos Stripe:**
- **Starter:** `prod_TlKgGXZyTRs2k8`
- **Pro:** `prod_TlKhFlnvjShnJm`

---

## 🎯 Passo a Passo Completo

### 1️⃣ Criar Preços (Prices) no Stripe

Você precisa criar os preços para cada produto. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com/).

#### Para o Plano STARTER (prod_TlKgGXZyTRs2k8):

1. Acesse **Produtos** > Clique em **Starter**
2. Clique em **Adicionar Preço**
3. **Preço Mensal:**
   - Valor: **R$ 97,00**
   - Tipo de faturamento: **Recorrente**
   - Intervalo: **Mensal**
   - Moeda: **BRL**
   - Copie o **Price ID** (será algo como `price_XXXXX`)

4. Clique novamente em **Adicionar Preço** para criar o anual
5. **Preço Anual:**
   - Valor: **R$ 970,00** (equivalente a ~R$ 80,83/mês)
   - Tipo de faturamento: **Recorrente**
   - Intervalo: **Anual**
   - Moeda: **BRL**
   - Copie o **Price ID**

#### Para o Plano PRO (prod_TlKhFlnvjShnJm):

1. Acesse **Produtos** > Clique em **Pro**
2. Clique em **Adicionar Preço**
3. **Preço Mensal:**
   - Valor: **R$ 197,00**
   - Tipo de faturamento: **Recorrente**
   - Intervalo: **Mensal**
   - Moeda: **BRL**
   - Copie o **Price ID**

4. Clique novamente em **Adicionar Preço** para criar o anual
5. **Preço Anual:**
   - Valor: **R$ 1.970,00** (equivalente a ~R$ 164,17/mês)
   - Tipo de faturamento: **Recorrente**
   - Intervalo: **Anual**
   - Moeda: **BRL**
   - Copie o **Price ID**

---

### 2️⃣ Configurar Variáveis de Ambiente no Vercel

1. Acesse **Vercel Dashboard** > Seu projeto > **Settings** > **Environment Variables**

2. **Deletar** as variáveis de teste antigas (se existirem):
   - `STRIPE_SECRET_KEY` (teste)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (teste)
   - `STRIPE_WEBHOOK_SECRET` (teste)

3. **Adicionar** as variáveis de PRODUÇÃO:

```bash
# Stripe Secret Key (Backend)
# Use a chave Live fornecida separadamente (sk_live_...)
STRIPE_SECRET_KEY=sk_live_XXXXX

# Stripe Publishable Key (Frontend)
# Você precisa pegar no Dashboard do Stripe:
# Developers > API Keys > Publishable key (Live)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX

# Webhook Secret (será configurado no passo 3)
STRIPE_WEBHOOK_SECRET=whsec_XXXXX
```

**⚠️ IMPORTANTE:** Marque todas como disponíveis para **Production**, **Preview** e **Development**

---

### 3️⃣ Configurar Webhook no Stripe

1. Acesse **Developers** > **Webhooks** no [Dashboard do Stripe](https://dashboard.stripe.com/)
2. Clique em **Add endpoint**
3. **Endpoint URL:** `https://SEU_DOMINIO.vercel.app/api/stripe/webhook`
   - Exemplo: `https://app.split2.com.br/api/stripe/webhook`
4. **Eventos para escutar:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Clique em **Add endpoint**
6. **Copie o Webhook Signing Secret** (começa com `whsec_`)
7. Adicione no Vercel como `STRIPE_WEBHOOK_SECRET`

---

### 4️⃣ Atualizar Planos no Banco de Dados

1. Abra o arquivo `scripts/setup-stripe-plans.sql`
2. **Substitua** os `PRICE_IDs` pelos que você criou:
   ```sql
   'SUBSTITUA_PELO_PRICE_ID_MENSAL_STARTER',  -- Ex: price_1ABC123
   'SUBSTITUA_PELO_PRICE_ID_ANUAL_STARTER',   -- Ex: price_1DEF456
   'SUBSTITUA_PELO_PRICE_ID_MENSAL_PRO',      -- Ex: price_1GHI789
   'SUBSTITUA_PELO_PRICE_ID_ANUAL_PRO',       -- Ex: price_1JKL012
   ```

3. Execute o script no seu banco Neon:
   - Acesse o **Neon Console**
   - Vá em **SQL Editor**
   - Cole e execute o script

**OU** execute via psql:
```bash
psql "postgresql://USER:PASSWORD@ep-odd-sea-acqgyxa1.sa-east-1.aws.neon.tech/neondb?sslmode=require" < scripts/setup-stripe-plans.sql
```

---

### 5️⃣ Deploy no Vercel

1. Commit e push das alterações (se houver)
2. Vercel vai fazer deploy automático
3. Aguarde o deploy completar

---

### 6️⃣ Testar o Fluxo de Pagamento

1. Acesse sua aplicação em produção
2. Vá para a página `/pricing`
3. Clique em **Assinar** em um dos planos pagos
4. Complete o checkout (use um cartão de teste do Stripe ou real)
5. Verifique se:
   - O usuário foi redirecionado com `?success=true`
   - O plano foi atualizado no banco
   - A assinatura foi criada

**Cartões de teste Stripe:**
```
Sucesso: 4242 4242 4242 4242
Falha:   4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

---

## 🔧 Troubleshooting

### Webhook não está funcionando?
1. Verifique se o `STRIPE_WEBHOOK_SECRET` está correto no Vercel
2. Veja os logs do webhook no Stripe Dashboard
3. Teste o endpoint manualmente com o Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

### Checkout não abre?
1. Verifique se `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` está configurado
2. Verifique se os Price IDs estão corretos no banco
3. Veja os logs no Vercel

### Usuário não foi atualizado após pagamento?
1. Verifique os logs do webhook no Vercel
2. Confirme que o evento `checkout.session.completed` foi recebido
3. Verifique se os metadados (userId, planId) estão sendo enviados

---

## 📊 Estrutura de Preços Sugerida

| Plano | Mensal | Anual | Economia Anual |
|-------|--------|-------|----------------|
| Free | R$ 0 | R$ 0 | - |
| Starter | R$ 97 | R$ 970 (~R$ 80,83/mês) | 16,6% |
| Pro | R$ 197 | R$ 1.970 (~R$ 164,17/mês) | 16,6% |

---

## ✅ Checklist Final

- [ ] Preços criados no Stripe (mensal e anual para Starter e Pro)
- [ ] `STRIPE_SECRET_KEY` configurado no Vercel (live)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configurado no Vercel (live)
- [ ] Webhook configurado no Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` configurado no Vercel
- [ ] Script SQL executado no banco com os Price IDs corretos
- [ ] Deploy feito no Vercel
- [ ] Teste de checkout realizado com sucesso

---

## 🎉 Pronto!

Seu sistema de pagamentos está configurado. Os usuários agora podem:
1. Assinar planos pagos via checkout do Stripe
2. Gerenciar assinaturas via portal do cliente (se configurado)
3. Ter os limites atualizados automaticamente
4. Receber downgrade automático ao cancelar

**Precisa de ajuda?** Verifique os logs no Vercel ou no Dashboard do Stripe.
