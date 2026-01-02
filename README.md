# 🚀 CLOUDFLARE FOR SAAS - PACOTE DE INSTALAÇÃO

## 📦 **CONTEÚDO:**

```
cloudflare-saas-package/
├── lib/
│   └── cloudflare.ts              ← Biblioteca Cloudflare API
├── app/api/domains/
│   ├── add/route.ts               ← API: Adicionar domínio
│   ├── verify/route.ts            ← API: Verificar status
│   ├── delete/route.ts            ← API: Deletar domínio
│   └── list/route.ts              ← API: Listar domínios
├── prisma/
│   └── schema-update.prisma       ← Schema Prisma (referência)
└── README.md                       ← Você está aqui!
```

---

## ✅ **INSTALAÇÃO (10 minutos):**

### **1. Extrair arquivos na pasta do projeto:**

```powershell
# Extrair o .tar.gz
# Copiar os arquivos para as pastas corretas:

D:\splitter\tracker-saas-standalone-lastone\
├── lib/
│   └── cloudflare.ts              ← COPIAR
├── app/api/domains/
│   ├── add/route.ts               ← COPIAR
│   ├── verify/route.ts            ← COPIAR
│   ├── delete/route.ts            ← COPIAR
│   └── list/route.ts              ← COPIAR
```

### **2. Verificar .env (já deve estar configurado):**

```bash
# Cloudflare for SaaS
CLOUDFLARE_API_TOKEN="seu_token"
CLOUDFLARE_ZONE_ID="seu_zone_id"
CLOUDFLARE_ACCOUNT_ID="seu_account_id"
```

✅ **Você já fez isso!**

### **3. Verificar Prisma Schema:**

Abrir `prisma/schema.prisma` e verificar se o model `CustomDomain` tem estes campos:

```prisma
model CustomDomain {
  // ... outros campos
  
  // Cloudflare for SaaS (VERIFICAR SE EXISTE)
  cloudflareHostnameId  String?  @unique
  sslStatus             String?
  verificationToken     String?  @db.Text
  verificationName      String?
}
```

**Se não tiver esses campos:**

```powershell
# Abrir schema.prisma
notepad prisma\schema.prisma

# Adicionar os campos acima no model CustomDomain

# Rodar migration
npx prisma migrate dev --name add_cloudflare_saas_fields

# Ou (mais rápido):
npx prisma db push
```

### **4. Commit e Push:**

```powershell
cd D:\splitter\tracker-saas-standalone-lastone

git add .
git commit -m "Add Cloudflare for SaaS integration"
git push
```

### **5. Aguardar Deploy Vercel:**

```
Vercel vai fazer deploy automaticamente (~2 minutos)

Verificar em: https://vercel.com
```

---

## 🎯 **COMO USAR:**

### **Adicionar Domínio:**

```javascript
// Frontend
const response = await fetch('/api/domains/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domain: 'track.cliente.com'
  })
});

const data = await response.json();

// data.dnsInstructions contém instruções para o cliente
```

### **Verificar Status:**

```javascript
const response = await fetch(`/api/domains/verify?domainId=123`);
const data = await response.json();

// data.domain.isActive = true/false
// data.message = instruções
```

### **Listar Domínios:**

```javascript
const response = await fetch('/api/domains/list');
const data = await response.json();

// data.domains = array de domínios
// data.stats = estatísticas
```

### **Deletar Domínio:**

```javascript
const response = await fetch(`/api/domains/delete?domainId=123`, {
  method: 'DELETE'
});

const data = await response.json();
```

---

## 🧪 **TESTAR:**

### **1. Testar API Add:**

```bash
# No terminal (substituir SEU-JWT pelo token de autenticação):
curl -X POST https://app.split2.com.br/api/domains/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU-JWT" \
  -d '{"domain":"track.teste.com"}'
```

### **2. Verificar no Dashboard Cloudflare:**

```
1. Ir em: https://dash.cloudflare.com
2. Clicar em: split2.com.br
3. SSL/TLS → Custom Hostnames
4. Ver domínio listado
```

### **3. Configurar DNS (teste real):**

```
No provedor do domínio:
Tipo: CNAME
Nome: track
Valor: (ver em dnsInstructions)
Proxy: OFF
```

### **4. Verificar Status:**

```bash
curl https://app.split2.com.br/api/domains/verify?domainId=1 \
  -H "Authorization: Bearer SEU-JWT"
```

---

## 📊 **FLUXO COMPLETO:**

```
1. Cliente adiciona domínio no Split2
   POST /api/domains/add
   ↓
   
2. Split2 cria Custom Hostname no Cloudflare
   ↓
   
3. Split2 retorna instruções DNS
   ↓
   
4. Cliente configura CNAME no DNS dele
   ↓
   
5. Cliente clica "Verificar DNS"
   GET /api/domains/verify
   ↓
   
6. Cloudflare valida DNS e provisiona SSL
   ↓
   
7. Status muda para "active"
   ↓
   
8. Cliente pode usar domínio em campanhas!
```

---

## ⚠️ **TROUBLESHOOTING:**

### **Erro: "Missing Cloudflare credentials"**

```
Solução:
1. Verificar se .env tem as 3 variáveis
2. Verificar se variáveis estão no Vercel
3. Redeploy no Vercel
```

### **Erro: "Failed to add custom hostname"**

```
Possíveis causas:
1. Domínio já existe em outra conta
2. Token sem permissões
3. Zona inválida

Solução:
1. Verificar logs no Vercel
2. Testar token manualmente via cURL
3. Verificar Zone ID correto
```

### **Status fica "pending" para sempre**

```
Causa: DNS não configurado ou incorreto

Solução:
1. Verificar CNAME no DNS
2. Aguardar propagação (até 24h)
3. Usar ferramenta: https://dnschecker.org
```

---

## 🎉 **PRONTO!**

Após instalar:

```
✅ APIs funcionando
✅ Cloudflare integrado
✅ Custom Hostnames automático
✅ SSL automático
✅ Ready to scale!
```

---

## 📞 **SUPORTE:**

Se tiver problemas:

1. Verificar logs no Vercel
2. Testar APIs via Postman/cURL
3. Verificar Cloudflare Dashboard
4. Ver console do navegador

---

**INSTALAÇÃO COMPLETA EM 10 MINUTOS! 🚀**

**ZERO CUSTO ATÉ 100 CLIENTES! 💰**

**100% AUTOMÁTICO! ✨**
