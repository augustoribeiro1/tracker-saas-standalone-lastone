# 🌐 GUIA: CONFIGURAR DOMÍNIO CUSTOMIZADO NO VERCEL

## 📋 **PROBLEMA:**
Quando você adiciona um domínio no Split2, ele cria o DNS, mas você ainda precisa **ADICIONAR O DOMÍNIO NO VERCEL** para funcionar!

**Erro típico:**
```
404: DEPLOYMENT_NOT_FOUND
```

---

## ✅ **SOLUÇÃO: 2 PASSOS**

### **PASSO 1: Adicionar no Split2 (VOCÊ JÁ FEZ!)**
✅ Dashboard → Domínios → Adicionar
✅ DNS configurado (check verde ✓)

### **PASSO 2: Adicionar no Vercel (FALTA FAZER!)**

---

## 🚀 **COMO ADICIONAR DOMÍNIO NO VERCEL:**

### **1. Abrir Vercel Dashboard:**
```
https://vercel.com/dashboard
```

### **2. Clicar no seu projeto:**
```
tracker-saas-standalone-lastone
```

### **3. Ir em "Settings":**
```
Settings → Domains
```

### **4. Adicionar domínio:**
```
┌─────────────────────────────────────┐
│ Add Domain                          │
│                                     │
│ track.bingostore.com.br            │
│ [Add]                               │
└─────────────────────────────────────┘
```

### **5. Vercel vai pedir para configurar DNS:**
```
✅ DNS já está configurado!
   (você já fez isso no Split2)
```

### **6. Clicar "Verify":**
```
Vercel vai checar o DNS...
✅ DNS OK!
⏳ Gerando SSL... (demora 5-15 min)
```

### **7. Aguardar SSL:**
```
Status: Pending Certificate ⏳
        ↓
        (aguarde 5-15 minutos)
        ↓
Status: Valid ✅
```

---

## 📊 **EXEMPLO COMPLETO:**

### **DNS (CloudFlare/Registro.br):**
```
Tipo: CNAME
Nome: track
Valor: cname.vercel-dns.com
TTL: Auto
```

### **Vercel Domains:**
```
Domain                        Status
──────────────────────────── ────────
track.bingostore.com.br      Valid ✅
tracker-saas-...vercel.app   Valid ✅
```

---

## 🔥 **DEPOIS DE CONFIGURAR:**

### **URLs que funcionam:**
```
✅ https://track.bingostore.com.br/r/caca
✅ https://tracker-saas-standalone-lastone.vercel.app/r/caca
```

### **Redirect automático:**
```
Visitante acessa:
https://track.bingostore.com.br/r/caca

Split2 redireciona para:
https://google.com?utm_term=T1-V1-ABC123
```

---

## ⚠️ **IMPORTANTE:**

### **SSL DEMORA!**
```
Adicionou domínio no Vercel:
↓
✅ DNS verificado (imediato)
↓
⏳ Gerando SSL... (5-15 min)
↓
✅ SSL ativo!
```

**Durante a geração:**
- ✅ HTTP funciona: http://track.bingostore.com.br
- ❌ HTTPS não: https://track.bingostore.com.br (erro SSL)

**Depois de 15 min:**
- ✅ HTTP funciona
- ✅ HTTPS funciona

---

## 🐛 **TROUBLESHOOTING:**

### **Erro: "Domain is already in use"**
**Causa:** Domínio já está em outro projeto Vercel
**Solução:** Remova do outro projeto primeiro

### **Erro: "Invalid DNS configuration"**
**Causa:** CNAME não está apontando certo
**Solução:** 
1. Verifique que CNAME aponta para `cname.vercel-dns.com`
2. Aguarde propagação (até 48h, geralmente 5 min)

### **Erro: "Pending Certificate" por mais de 30 min**
**Causa:** Problema com Let's Encrypt
**Solução:** 
1. Remova domínio do Vercel
2. Aguarde 5 min
3. Adicione de novo

---

## 📝 **CHECKLIST:**

```
☐ DNS CNAME configurado
☐ Domínio adicionado no Vercel
☐ DNS verificado no Vercel (✓)
☐ Aguardar SSL (5-15 min)
☐ Testar: https://track.bingostore.com.br/r/caca
```

---

## 💡 **DICA PRO:**

Configure **MÚLTIPLOS domínios** para múltiplas campanhas:

```
track.bingostore.com.br  → Campanha geral
go.bingostore.com.br     → Campanhas de urgência
clique.bingostore.com.br → Campanhas de remarketing
```

Todos funcionam com o mesmo app Split2!

---

## 🎯 **RESUMO RÁPIDO:**

1. **Split2:** Adiciona domínio → Configura DNS ✅
2. **Vercel:** Settings → Domains → Add → Verify ✅
3. **Aguarda:** 5-15 min SSL ⏳
4. **Testa:** https://seu-dominio.com/r/slug ✅

**Pronto!** 🎉
