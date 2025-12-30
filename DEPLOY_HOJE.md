# 🚀 GUIA DE DEPLOY - PASSO A PASSO

## 📦 **ARQUIVO: SPLIT2-DEPLOY-COMPLETE.tar.gz**

Este pacote contém TUDO que você precisa para deployar o Split2 completo com:
- ✅ Debug de DNS
- ✅ Correção de domínios antigos
- ✅ Redirector corrigido
- ✅ Suporte a Cloudflare Workers
- ✅ Todos os guias

---

## ⚡ **DEPLOY RÁPIDO (10 MINUTOS):**

### **1. EXTRAIR (1 min)**

```powershell
# Windows PowerShell
cd D:\splitter
tar -xzf SPLIT2-DEPLOY-COMPLETE.tar.gz
```

Isso vai criar: `D:\splitter\tracker-saas-standalone\`

---

### **2. ATUALIZAR BANCO (2 min)**

```powershell
cd D:\splitter\tracker-saas-standalone

# Atualizar schema (adiciona campos novos)
npx prisma db push
```

**Vai adicionar:**
- ✅ `vercelDnsTarget` em CustomDomain
- ✅ Outros campos necessários

**Aguarde:** ~30 segundos

---

### **3. COMMIT E PUSH (2 min)**

```powershell
# Ir para seu projeto deployado
cd D:\splitter\tracker-saas-standalone-lastone

# Copiar arquivos atualizados
# (sobrescrever tudo do tracker-saas-standalone)
# OU fazer merge manual dos arquivos

# Commit
git add .
git commit -m "Add: DNS debug, domain fixes, Cloudflare Worker support"

# Push
git push
```

**Vercel vai detectar e fazer deploy automático!**

---

### **4. AGUARDAR DEPLOY (3 min)**

```
1. Vercel → Dashboard
2. Seu projeto → Deployments
3. Ver status: Building... → Ready ✅
```

**Aguarde:** ~2-3 minutos

---

### **5. TESTAR BÁSICO (2 min)**

**Teste 1: Dashboard**
```
https://tracker-saas-standalone-lastone.vercel.app/dashboard
✅ Deve carregar
✅ Ver campanhas
✅ Ver domínios
```

**Teste 2: API Redirect**
```
https://tracker-saas-standalone-lastone.vercel.app/api/redirect/caca
✅ Deve retornar JSON
✅ Com destinationUrl
```

**Teste 3: Redirect Real**
```
https://track.bingostore.com.br/r/caca
✅ Deve redirecionar (ou proxy se Worker configurado)
```

---

## 🔍 **TESTE DE DEBUG DNS (IMPORTANTE!):**

### **Passo 1: Abrir Console**

```
1. Dashboard → Domínios
2. F12 (DevTools)
3. Console aberto
4. Network aberto
```

### **Passo 2: Adicionar Domínio Teste**

```
Domínio: teste999.bingostore.com.br
Clicar: Adicionar
```

### **Passo 3: Ver Resposta no Console**

Procure por:
```json
{
  "domain": {...},
  "message": "...",
  "dnsTarget": "...",  ← COPIAR ESTE VALOR!
  "debug": {
    "vercelResponse": {...}  ← COPIAR ESTRUTURA COMPLETA!
  }
}
```

**COPIAR E ENVIAR PARA MIM!** 📋

---

### **Passo 4: Ver Logs do Servidor**

```
1. Vercel → Deployments → Latest
2. Functions → /api/domains
3. Ver logs em tempo real
```

Procure por:
```
[Domains API] Adicionando domínio teste999...
[Domains API] Domínio adicionado ao Vercel: {...}
[Domains API] Estrutura do domain: {...}
[Domains API] DNS target extraído: xxx
```

**COPIAR E ENVIAR PARA MIM!** 📋

---

### **Passo 5: Testar Endpoint Fix DNS**

```
Abrir no navegador:
https://tracker-saas-standalone-lastone.vercel.app/api/domains/fix-dns
```

Deve retornar:
```json
{
  "message": "X domínio(s) atualizado(s)",
  "updated": X,
  "results": [...]
}
```

**COPIAR E ENVIAR PARA MIM!** 📋

---

## 📊 **O QUE EU PRECISO DE VOCÊ:**

### **Para corrigir DNS definitivamente:**

**1. Resposta do Console (ao adicionar domínio):**
```json
// COLAR AQUI:


```

**2. Logs do Vercel Functions:**
```
// COLAR AQUI:


```

**3. Resposta do /api/domains/fix-dns:**
```json
// COLAR AQUI:


```

**Com essas 3 informações eu consigo:**
- ✅ Ver estrutura EXATA da resposta Vercel
- ✅ Ajustar código para extrair DNS correto
- ✅ Deploy final com DNS funcionando
- ✅ Problema resolvido permanentemente!

---

## 🛠️ **PRÓXIMO PASSO: CLOUDFLARE WORKERS**

### **Depois que DNS estiver OK:**

1. ✅ Deploy Split2 funcionando
2. ✅ DNS target correto
3. ➡️ **Configurar Cloudflare Worker**
4. ➡️ Proxy reverso
5. ➡️ Meta Ads aprovando
6. ✅ Sistema completo!

---

## 📁 **ESTRUTURA DO PACOTE:**

```
tracker-saas-standalone/
├── app/
│   ├── api/
│   │   ├── campaigns/
│   │   │   └── route.ts (CREATE/LIST campanhas)
│   │   ├── domains/
│   │   │   ├── route.ts (DNS debug logs)
│   │   │   └── fix-dns/route.ts (Corrigir DNS antigos)
│   │   └── redirect/
│   │       └── [slug]/route.ts (Para Cloudflare Worker)
│   ├── r/
│   │   └── [slug]/route.ts (Redirector corrigido)
│   └── (dashboard)/
│       └── domains/page.tsx (UI com botão fix)
├── cloudflare/
│   ├── worker.js (Básico)
│   ├── worker-with-pixels.js (Com suporte pixels)
│   └── worker-multitenant.js (Multi-tenant + subdomínio)
├── lib/
│   └── vercel.ts (API Vercel integração)
├── prisma/
│   ├── schema.prisma (Com vercelDnsTarget)
│   └── migrations/ (SQL migrations)
└── GUIAS:
    ├── CLOUDFLARE_WORKER_GUIDE.md
    ├── PIXELS_COM_PROXY.md
    ├── ESTRATEGIA_SUBDOMINIO.md
    ├── DEBUG_DNS_TARGET.md
    ├── VERCEL_API_SETUP.md
    └── CONFIGURAR_DOMINIO.md
```

---

## ⚠️ **IMPORTANTE:**

### **NÃO esquecer:**
- ✅ `npx prisma db push` (antes do git push)
- ✅ F12 aberto ao testar
- ✅ Copiar TODA resposta JSON
- ✅ Copiar TODOS os logs

### **Env vars necessárias (já tem?):**
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://...
VERCEL_TOKEN=vercel_xxx (se já configurou)
VERCEL_PROJECT_ID=prj_xxx (se já configurou)
```

---

## 🎯 **CHECKLIST COMPLETO:**

```
☐ Extrair SPLIT2-DEPLOY-COMPLETE.tar.gz
☐ cd tracker-saas-standalone
☐ npx prisma db push
☐ cd ../tracker-saas-standalone-lastone
☐ Copiar arquivos atualizados
☐ git add .
☐ git commit -m "..."
☐ git push
☐ Aguardar deploy (3 min)
☐ Testar dashboard
☐ F12 → Console → Network
☐ Adicionar domínio teste
☐ Copiar resposta JSON completa
☐ Vercel → Functions → Ver logs
☐ Copiar logs completos
☐ Testar /api/domains/fix-dns
☐ Copiar resposta
☐ Enviar as 3 coisas para mim
☐ ✅ Vou corrigir definitivamente!
```

---

## 💪 **DEPOIS DO DEBUG:**

### **Vamos configurar:**
1. ✅ Cloudflare Worker
2. ✅ Proxy reverso
3. ✅ Subdomínio do cliente
4. ✅ Pixels funcionando
5. ✅ Meta Ads aprovando
6. ✅ Sistema completo!

---

## 🚀 **VAMOS LÁ!**

**1. Deploy agora (10 min)**
**2. Testar e enviar logs (5 min)**
**3. Eu corrijo (5 min)**
**4. Redeploy final (3 min)**
**5. Cloudflare Worker (10 min)**

**TOTAL: ~33 minutos para sistema completo!** ⚡

---

## 📞 **DÚVIDAS?**

Me mande:
- ✅ Erros que aparecerem
- ✅ Screenshots se ajudar
- ✅ Dúvidas sobre qualquer passo

**Estou aqui para ajudar!** 💪

---

## 🎉 **BOA SORTE!**

**Você está a 30 minutos de ter:**
- ✅ Split2 100% funcional
- ✅ Tracking perfeito
- ✅ Meta Ads aprovando
- ✅ Sistema profissional

**BORA! 🚀**
