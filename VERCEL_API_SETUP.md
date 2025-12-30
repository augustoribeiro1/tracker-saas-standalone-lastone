# 🚀 CONFIGURAR VERCEL API (DOMÍNIOS AUTOMÁTICOS)

## 🎯 **O QUE ISSO FAZ:**

Quando um **USUÁRIO** adiciona domínio no Split2:
```
Usuário: "Adicionar track.meusite.com"
         ↓
Split2:  Chama Vercel API automaticamente
         ↓
Vercel:  Adiciona domínio ao projeto
         ↓
Result:  ✅ DOMÍNIO CONFIGURADO AUTOMATICAMENTE!
```

**ZERO intervenção manual!** 🎉

---

## 📝 **PASSO 1: CRIAR TOKEN DA VERCEL API**

### **1. Abrir Vercel Dashboard:**
```
https://vercel.com/account/tokens
```

### **2. Clicar "Create Token":**
```
Token Name: Split2 API
Scope: Full Account
Expiration: No Expiration (recomendado)
```

### **3. Copiar o token:**
```
vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ IMPORTANTE:** Guarde em local seguro! Só aparece UMA VEZ!

---

## 🔑 **PASSO 2: PEGAR PROJECT ID**

### **1. Abrir seu projeto no Vercel:**
```
https://vercel.com/dashboard
→ Clique no projeto: tracker-saas-standalone-lastone
```

### **2. Settings → General:**
```
Project ID: prj_xxxxxxxxxxxxxxxxxxxxx
```

**Copie esse ID!**

---

## 🏢 **PASSO 3: PEGAR TEAM ID (SE APLICÁVEL)**

### **Se você usa Vercel Teams:**

```
1. Settings → Team
2. Team ID: team_xxxxxxxxxxxxx
```

### **Se você NÃO usa Teams:**

**Pule este passo!** Não precisa.

---

## ⚙️ **PASSO 4: ADICIONAR NO VERCEL (ENV VARS)**

### **1. Vercel Dashboard → seu projeto:**
```
Settings → Environment Variables
```

### **2. Adicionar 3 variáveis:**

**Variável 1:**
```
Name:  VERCEL_TOKEN
Value: vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Variável 2:**
```
Name:  VERCEL_PROJECT_ID
Value: prj_xxxxxxxxxxxxxxxxxxxxx
```

**Variável 3 (OPCIONAL - só se usar Teams):**
```
Name:  VERCEL_TEAM_ID
Value: team_xxxxxxxxxxxxx
```

### **3. Clicar "Save" em cada uma**

### **4. Fazer REDEPLOY:**
```
Deployments → Latest → ... → Redeploy
```

**Aguarde 3 minutos...**

---

## ✅ **PASSO 5: TESTAR!**

### **1. No Split2:**
```
Dashboard → Domínios → Adicionar Novo Domínio
Digite: test.seusite.com
Clicar: Adicionar
```

### **2. Verificar logs (F12 Console):**
```
[Domains API] Adicionando domínio test.seusite.com ao Vercel...
[Domains API] Domínio test.seusite.com adicionado ao Vercel: {success: true}
```

### **3. Verificar Vercel Dashboard:**
```
Settings → Domains
✅ test.seusite.com aparece na lista!
```

**SE APARECER = FUNCIONOU!** 🎉

---

## 🔄 **COMO FUNCIONA:**

```
┌─────────────────────────────────────────────────────────┐
│                    FLUXO AUTOMÁTICO                      │
└─────────────────────────────────────────────────────────┘

1. USUÁRIO:
   "Adicionar track.meusite.com"
   
2. SPLIT2 API (/api/domains POST):
   ✓ Valida formato
   ✓ Chama addDomainToVercel(domain)
   
3. VERCEL API:
   POST /v10/projects/{PROJECT_ID}/domains
   Headers: Authorization: Bearer {TOKEN}
   Body: { name: "track.meusite.com" }
   
4. VERCEL:
   ✓ Adiciona domínio
   ✓ Espera DNS
   ✓ Gera SSL automático (15 min)
   
5. RESULTADO:
   ✅ Domínio configurado
   ✅ SSL ativo
   ✅ Redirects funcionando!
```

---

## 🐛 **TROUBLESHOOTING:**

### **Erro: "VERCEL_TOKEN not configured"**
**Causa:** Falta adicionar token nas env vars
**Solução:** 
1. Vercel → Settings → Environment Variables
2. Adicionar VERCEL_TOKEN
3. Redeploy

### **Erro: "Domain already in use"**
**Causa:** Domínio já está em outro projeto
**Solução:** 
1. Remova do outro projeto
2. Tente novamente

### **Erro: "Invalid token"**
**Causa:** Token expirou ou foi revogado
**Solução:**
1. Criar novo token
2. Atualizar env var
3. Redeploy

### **Domínio adicionado mas SSL não gera**
**Causa:** DNS não está configurado
**Solução:**
1. Configurar CNAME: cname.vercel-dns.com
2. Aguardar propagação (5 min)
3. Vercel vai gerar SSL automaticamente

---

## 📊 **EXEMPLO REAL:**

### **Usuário adiciona domínio:**
```javascript
// Frontend
fetch('/api/domains', {
  method: 'POST',
  body: JSON.stringify({ domain: 'track.meusite.com' })
})
```

### **Backend processa:**
```typescript
// /api/domains/route.ts
const vercelResult = await addDomainToVercel('track.meusite.com');
// { success: true, domain: {...} }
```

### **Vercel API response:**
```json
{
  "name": "track.meusite.com",
  "apexName": "meusite.com",
  "projectId": "prj_xxx",
  "verified": false,
  "verification": [
    {
      "type": "CNAME",
      "domain": "track.meusite.com",
      "value": "cname.vercel-dns.com",
      "reason": "Pending Verification"
    }
  ]
}
```

### **Usuário configura DNS:**
```
CNAME: track → cname.vercel-dns.com
```

### **15 minutos depois:**
```
✅ DNS verificado
✅ SSL gerado
✅ https://track.meusite.com/r/campanha funciona!
```

---

## 💡 **VANTAGENS:**

```
✅ ZERO intervenção manual
✅ Escalável infinitamente
✅ SSL automático
✅ Usuários adicionam domínios livremente
✅ Você só monitora, não gerencia
```

---

## 🔒 **SEGURANÇA:**

### **Token da Vercel:**
- ✅ Fica APENAS no servidor (env vars)
- ✅ NUNCA exposto ao frontend
- ✅ NUNCA no código Git
- ✅ Scope: Apenas adicionar/remover domínios

### **Validações:**
```typescript
// Só usuários autenticados
if (!session?.user) return 401;

// Formato válido
if (!domain.match(/regex/)) return 400;

// Não duplicado
if (existing) return 400;
```

---

## 📝 **CHECKLIST COMPLETO:**

```
☐ Criar token Vercel API
☐ Copiar Project ID
☐ (Opcional) Copiar Team ID
☐ Adicionar env vars no Vercel
☐ Redeploy
☐ Testar adicionando domínio
☐ Verificar no Vercel Dashboard
☐ Confirmar SSL gerado (15 min)
```

---

## 🎉 **PRONTO!**

Agora **QUALQUER USUÁRIO** pode adicionar domínios e eles vão **AUTOMATICAMENTE** para o Vercel!

**ZERO trabalho manual!** 🚀💪
