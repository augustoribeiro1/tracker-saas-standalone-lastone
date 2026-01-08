# 🔧 Troubleshooting - Email Reset de Senha

## ❌ Erro: "Unexpected socket close"

Este erro ocorre quando há problema de conexão com o servidor SMTP.

---

## ✅ Soluções para Zoho Mail

### **Opção 1: Usar TLS (Porta 587) - RECOMENDADO**

O Zoho geralmente funciona melhor com TLS na porta 587:

```env
SMTP_PROTOCOL=TLS
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=augusto@cliquemidias.com.br
SMTP_PASS=sua-senha
SMTP_FROM="Split2 <augusto@cliquemidias.com.br>"
```

### **Opção 2: Usar SSL (Porta 465)**

Se preferir SSL:

```env
SMTP_PROTOCOL=SSL
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=augusto@cliquemidias.com.br
SMTP_PASS=sua-senha
SMTP_FROM="Split2 <augusto@cliquemidias.com.br>"
```

---

## 🔐 Zoho: Senha de Aplicativo

O Zoho pode exigir **senha de aplicativo** ao invés da senha normal:

### Como Gerar Senha de Aplicativo no Zoho:

1. Acesse: https://accounts.zoho.com/home#security/application_specific_passwords
2. Clique em "Generate New Password"
3. Nome: `Split2`
4. Copie a senha gerada
5. Use essa senha no `SMTP_PASS` (não a senha normal)

---

## 🧪 Testar Configuração

### Teste Rápido no Node.js:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: 'seu-email@cliquemidias.com.br',
    pass: 'sua-senha-de-aplicativo'
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Erro:', error);
  } else {
    console.log('✅ Servidor pronto para enviar emails');
  }
});
```

---

## 🔍 Checklist de Verificação

- [ ] **Usuário correto**: Email completo (augusto@cliquemidias.com.br)
- [ ] **Senha correta**: Usar senha de aplicativo (não a senha normal)
- [ ] **Porta correta**:
  - 587 para TLS (SMTP_PROTOCOL=TLS)
  - 465 para SSL (SMTP_PROTOCOL=SSL)
- [ ] **Host correto**: smtp.zoho.com
- [ ] **SMTP ativado**: Verificar no painel do Zoho se SMTP está habilitado
- [ ] **2FA**: Se tiver 2FA ativo, DEVE usar senha de aplicativo
- [ ] **Limites**: Verificar se não excedeu limite de emails do Zoho

---

## 🌐 Alternativas ao Zoho

Se continuar com problemas, considere:

### **Gmail (Grátis)**
```env
SMTP_PROTOCOL=TLS
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=senha-de-app-google
```
- Requer: Senha de App (https://myaccount.google.com/apppasswords)
- Limite: ~100 emails/dia

### **SendGrid (Grátis até 100/dia)**
```env
SMTP_PROTOCOL=TLS
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.sua-api-key-aqui
```
- Cadastro: https://sendgrid.com
- Mais confiável para produção

### **Mailgun (Grátis até 5000/mês)**
```env
SMTP_PROTOCOL=TLS
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seu-dominio.mailgun.org
SMTP_PASS=sua-senha-mailgun
```

---

## 📋 Logs Úteis

Depois das alterações, verifique nos logs da Vercel:

### ✅ Log de Sucesso:
```
📧 Configurando SMTP: smtp.zoho.com:587 (SSL: false)
✅ Email de reset enviado para: usuario@email.com
```

### ❌ Logs de Erro:
```
❌ Erro ao enviar email: {
  message: "...",
  code: "EAUTH" <- Erro de autenticação
  code: "ECONNECTION" <- Erro de conexão
  code: "ETIMEDOUT" <- Timeout
}
```

---

## 🚀 Próximos Passos

1. **Tente TLS (porta 587)** ao invés de SSL
2. **Gere uma senha de aplicativo** no Zoho
3. **Atualize as variáveis** no Vercel
4. **Faça novo deploy**
5. **Teste novamente**

---

## 💡 Dica Final

Se o problema persistir, **use Gmail ou SendGrid** temporariamente para validar que o resto do código está funcionando. Depois volta para o Zoho.
