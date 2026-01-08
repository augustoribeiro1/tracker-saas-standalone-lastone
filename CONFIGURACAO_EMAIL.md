# 📧 Configuração de Email para Reset de Senha

## Status Atual
O sistema de **"Esqueci minha senha"** está **funcionando**, mas o envio de email está em modo de **desenvolvimento** (apenas exibe o link no console).

## 🔧 Para Ativar o Envio de Emails em Produção

### 1. Instalar Nodemailer
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. Configurar Variáveis de Ambiente
Adicione no arquivo `.env`:
```env
# Configuração SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM="Split2 <noreply@seudominio.com>"

# URL da aplicação
NEXTAUTH_URL=https://seudominio.com
```

### 3. Ativar Código no arquivo `lib/email.ts`
Descomente o código de envio de email no arquivo `lib/email.ts` (linhas 19-44)

## 📮 Provedores SMTP Recomendados

### Gmail (Gratuito)
- Host: `smtp.gmail.com`
- Porta: `587`
- Requer: "Senha de App" (não é a senha normal)
- Como gerar: https://myaccount.google.com/apppasswords

### SendGrid (Grátis até 100 emails/dia)
- Host: `smtp.sendgrid.net`
- Porta: `587`
- User: `apikey`
- Pass: Sua API Key do SendGrid

### Mailgun (Grátis até 5.000 emails/mês)
- Host: `smtp.mailgun.org`
- Porta: `587`
- Requer: Cadastro no Mailgun

### AWS SES (Produção)
- Host: `email-smtp.us-east-1.amazonaws.com`
- Porta: `587`
- Requer: Configuração na AWS

## 🧪 Como Testar em Desenvolvimento

### Opção 1: Mailtrap (Recomendado)
Serviço gratuito para testar emails em dev:
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=seu-user-mailtrap
SMTP_PASS=sua-senha-mailtrap
```
Cadastro: https://mailtrap.io

### Opção 2: Console (Atual)
O sistema atual mostra o link no console do servidor:
```
📧 EMAIL DE RESET DE SENHA
============================================================
Para: usuario@email.com
Link de reset: http://localhost:3000/auth/reset-password?token=abc123...
============================================================
```

Basta copiar o link e colar no navegador para testar.

## ✅ Fluxo Funcionando

Mesmo sem SMTP configurado, o sistema já funciona:

1. ✅ Usuário clica em "Esqueci minha senha"
2. ✅ Informa o email
3. ✅ Sistema gera token seguro
4. ✅ Token é salvo no banco (expira em 1h)
5. ⚠️ Link aparece no console (em dev)
6. ✅ Usuário acessa o link
7. ✅ Cria nova senha
8. ✅ Senha é atualizada com sucesso

## 🔐 Segurança Implementada

- ✅ Tokens únicos e hasheados (SHA-256)
- ✅ Expiração automática (1 hora)
- ✅ Token deletado após uso
- ✅ Senhas com bcrypt
- ✅ Não revela se email existe (segurança)
- ✅ Rate limiting automático (Vercel)

## 📝 Próximos Passos

1. Escolher provedor SMTP (Gmail, SendGrid, etc)
2. Configurar variáveis de ambiente
3. Descomentar código em `lib/email.ts`
4. Testar envio de email
5. Verificar spam/inbox
6. Ajustar template do email se necessário
