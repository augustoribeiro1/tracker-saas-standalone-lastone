# 🔍 DEBUG: Por que DNS mostra valor genérico?

## 🐛 PROBLEMA:

Domínios mostram:
```
❌ cname.vercel-dns.com (genérico)
```

Ao invés de:
```
✅ f93e2d219d2201f4.vercel-dns-017.com (específico)
```

---

## 🕵️ INVESTIGAÇÃO:

### **Passo 1: Ver logs do Vercel**

1. **Vercel Dashboard → Seu projeto**
2. **Deployments → Latest**
3. **Functions → /api/domains**
4. **Ver logs**

### **Passo 2: Adicionar domínio de teste**

1. **Dashboard → Domínios**
2. **Adicionar:** `teste123.seusite.com`
3. **F12 → Console (abrir ANTES de clicar)**
4. **Clicar "Adicionar"**

### **Passo 3: Ver resposta da API**

No console, procure por:
```javascript
{
  domain: {...},
  message: "...",
  dnsTarget: "...",  // ← O QUE ESTÁ AQUI?
  debug: {
    vercelResponse: {...}  // ← ESTRUTURA COMPLETA
  }
}
```

### **Passo 4: Copiar e colar aqui:**

```json
// COLE A RESPOSTA COMPLETA AQUI:


```

---

## 🔍 O QUE PROCURAR NOS LOGS:

### **Logs do servidor (Vercel Functions):**

```
[Domains API] Adicionando domínio teste123.seusite.com ao Vercel...
[Domains API] Domínio teste123.seusite.com adicionado ao Vercel: {...}
[Domains API] Estrutura do domain: {...}
[Domains API] DNS target extraído: xxx.vercel-dns-017.com
```

**OU (se falhar):**

```
[Domains API] verification não existe ou não é array
[Domains API] CNAME record não encontrado no verification
```

---

## 💡 POSSÍVEIS CAUSAS:

### **1. Vercel retorna estrutura diferente**

**Esperado:**
```json
{
  "success": true,
  "domain": {
    "name": "teste.com",
    "verification": [
      {
        "type": "CNAME",
        "value": "xxx.vercel-dns-017.com"
      }
    ]
  }
}
```

**Se a estrutura for diferente, o código não encontra o valor!**

---

### **2. VERCEL_TOKEN sem permissões**

Token criado sem "Full Access" não retorna todos os dados.

**Solução:**
1. Criar novo token com Full Access
2. Atualizar env var
3. Redeploy

---

### **3. Domínio já existia antes**

Se o domínio JÁ estava no Vercel, a API retorna erro ou resposta diferente.

**Solução:**
1. Remover domínio do Vercel
2. Adicionar de novo no Split2

---

## 🔧 WORKAROUND TEMPORÁRIO:

Enquanto debugamos, use este endpoint manual:

### **URL:**
```
GET https://seu-app.vercel.app/api/domains/fix-dns
```

### **O que faz:**
- Busca TODOS domínios sem DNS correto
- Consulta Vercel API diretamente
- Atualiza banco com DNS específico

### **Como usar:**
1. Abra no navegador:
   ```
   https://tracker-saas-standalone-lastone.vercel.app/api/domains/fix-dns
   ```

2. Deve retornar:
   ```json
   {
     "message": "2 domínio(s) atualizado(s)",
     "updated": 2,
     "results": [...]
   }
   ```

3. Recarregue página de domínios
4. Ver instruções
5. ✅ DNS agora está correto!

---

## 📊 CHECKLIST DE DEBUG:

```
☐ Deploy com logs feito
☐ Vercel Functions → Ver logs
☐ Adicionar domínio teste
☐ Console aberto (F12)
☐ Copiar resposta completa
☐ Verificar logs do servidor
☐ Testar endpoint /fix-dns
☐ Reportar estrutura da resposta
```

---

## 🎯 OBJETIVO:

Encontrar a **estrutura EXATA** da resposta da Vercel API para ajustar o código.

---

## 📝 TEMPLATE DE REPORT:

```
TESTE:
- Domínio adicionado: teste123.seusite.com
- Data/Hora: [...]

RESPOSTA DA API (Console):
{
  // COLE AQUI
}

LOGS DO SERVIDOR (Vercel Functions):
[Domains API] ...
[Domains API] ...

RESULTADO:
- DNS Target salvo no banco: [...]
- DNS Target mostrado no modal: [...]
```

---

## 💪 PRÓXIMOS PASSOS:

1. Deploy com logs
2. Testar com domínio novo
3. Copiar TODOS os logs
4. Enviar para análise
5. Ajustar código com estrutura correta
6. Redeploy
7. ✅ Problema resolvido!
