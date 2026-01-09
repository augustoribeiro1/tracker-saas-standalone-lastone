# 🎯 Como Executar o Script SQL no Neon

## Passo a Passo:

### 1️⃣ Acesse o Neon Console
Vá para: https://console.neon.tech/

### 2️⃣ Selecione seu Projeto
- Clique no projeto **tracker-saas-standalone-lastone** (ou o nome do seu projeto)

### 3️⃣ Abra o SQL Editor
- No menu lateral esquerdo, clique em **"SQL Editor"**
- Ou use o atalho: https://console.neon.tech/app/projects/YOUR_PROJECT_ID/sql-editor

### 4️⃣ Cole o Script
1. Abra o arquivo: `scripts/setup-stripe-plans-final.sql`
2. **Copie TODO o conteúdo** do arquivo
3. **Cole** no SQL Editor do Neon

### 5️⃣ Execute o Script
1. Clique no botão **"Run"** (ou pressione `Ctrl + Enter` / `Cmd + Enter`)
2. Aguarde a execução (deve levar poucos segundos)

### 6️⃣ Verifique os Resultados
Você verá a tabela de resultados mostrando os 3 planos criados:

| name | displayName | monthlyPrice | stripeProductId | stripePriceIdMonthly |
|------|-------------|--------------|-----------------|----------------------|
| free | Free | 0 | NULL | NULL |
| starter | Starter | 97 | prod_TlKgGXZyTRs2k8 | price_1Sno1XDsvoAmqjyaGfH9BwGu |
| pro | Pro | 247 | prod_TlKhFlnvjShnJm | price_1Sno21DsvoAmqjyaZfulcf8A |

---

## ✅ Pronto!

Seus planos estão configurados no banco de dados. Agora você pode:

1. ✅ Acessar `/pricing` na sua aplicação
2. ✅ Clicar em "Assinar" nos planos pagos
3. ✅ O checkout do Stripe será aberto
4. ✅ Após o pagamento, o usuário será atualizado automaticamente

---

## ⚠️ IMPORTANTE

Se você já tinha planos criados antes, eles foram **deletados** no início do script. Isso é normal - estamos recriando tudo do zero com as configurações corretas do Stripe.

---

## 🔧 Troubleshooting

### Erro: "relation 'Plan' does not exist"
- Você precisa executar as migrations do Prisma antes
- Execute: `npx prisma db push` localmente ou aguarde o deploy

### Erro: "violates foreign key constraint"
- O script já limpa as assinaturas antes, mas se der erro, execute apenas os INSERTs sem os DELETEs

### Dúvidas?
- Verifique os logs no Vercel após fazer um teste de checkout
- Verifique no Stripe Dashboard se o webhook está recebendo eventos
