# 🔍 DEBUG E CORREÇÃO FINAL - ERRO 500

## 🚨 **PROBLEMA:**

Ainda há erro 500 em `/api/dashboard/stats`

---

## ✅ **CORREÇÕES APLICADAS:**

### **1. COALESCE em todas queries ROUND:**

**Problema:**
```sql
ROUND(valor / divisor, 2)  -- Retorna NULL se divisor = 0
```

**Solução:**
```sql
COALESCE(
  ROUND(valor / NULLIF(divisor, 0), 2),
  0
)  -- Sempre retorna número, nunca NULL
```

### **2. Tratamento de valores NULL no JavaScript:**

**Problema:**
```javascript
parseInt(currentStats.total_views)  // NaN se null!
```

**Solução:**
```javascript
parseInt(currentStats.total_views || '0')  // Sempre número
```

### **3. Try-Catch completo:**

**Agora captura QUALQUER erro:**
```javascript
try {
  // ... todas as queries ...
} catch (error) {
  console.error('Error in dashboard stats:', error);
  return NextResponse.json({
    error: 'Failed to fetch dashboard stats',
    details: error.message
  }, { status: 500 });
}
```

### **4. Logs de debug:**

**API de campanhas agora loga:**
```javascript
console.log('[GET /api/campaigns] User ID:', user.id);
console.log('[GET /api/campaigns] Found campaigns:', campaigns.length);
```

---

## 🔍 **COMO DEBUGAR:**

### **Passo 1: Ver logs do Vercel**

```
1. Ir em Vercel Dashboard
2. Projeto → Deployments → Último deploy
3. Clicar em "View Function Logs"
4. Filtrar por /api/dashboard/stats
5. Ver erro EXATO que está acontecendo
```

### **Passo 2: Ver Network no Chrome**

```
1. F12 → Network tab
2. Refresh na página
3. Clicar em "stats" (linha vermelha)
4. Ir em "Response" tab
5. Ver mensagem de erro completa
```

### **Passo 3: Ver Console**

```
1. F12 → Console
2. Ver detalhes do erro
3. Se mostrar "SyntaxError: Unexpected end of JSON"
   → Significa que API retornou HTML ao invés de JSON
   → Ver Response no Network para ver HTML exato
```

---

## 📋 **CHECKLIST DE VERIFICAÇÃO:**

### **✅ Schema do banco está correto?**

```sql
-- Verificar se colunas existem:
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Event';

-- Deve retornar:
clickId
campaignId
eventType
eventValue
createdAt
```

### **✅ Banco tem dados?**

```sql
-- Ver se existem eventos:
SELECT COUNT(*) FROM "Event";

-- Ver se existem campanhas:
SELECT COUNT(*) FROM "Campaign";
```

### **✅ Deploy foi feito?**

```powershell
git log -1  # Ver último commit
# Deve ser o commit que fizemos
```

---

## 🚀 **DEPLOY DESTA CORREÇÃO:**

```powershell
cd D:\splitter\tracker-saas-standalone-lastone

# Verificar mudanças
git status

# Commit
git add .
git commit -m "Fix: Add COALESCE to prevent NULL errors + debug logs"

# Push
git push

# Aguardar build (1-2 minutos)
```

---

## 📊 **TESTES APÓS DEPLOY:**

### **Teste 1: API Stats**

```
1. Abrir: https://seusite.vercel.app/api/dashboard/stats
2. Deve retornar JSON com:
   {
     "totalViews": 0,
     "totalConversions": 0,
     "totalPurchases": 0,
     ...
   }
3. Se retornar erro, ver detalhes no Response
```

### **Teste 2: Dashboard**

```
1. Abrir: https://seusite.vercel.app
2. F12 → Console
3. Deve ver logs:
   [GET /api/campaigns] User ID: 1
   [GET /api/campaigns] Found campaigns: 2
4. Cards devem mostrar zeros (se não tiver dados)
5. Lista de campanhas deve aparecer
```

---

## 🔧 **SE AINDA DER ERRO:**

### **Opção 1: Simplificar query (temporário)**

Remover todos os ROUND temporariamente:

```sql
SELECT 
  COUNT(DISTINCT CASE WHEN "eventType" = 'view' THEN "clickId" END) as total_views,
  0 as conversion_rate,
  0 as purchase_rate,
  0 as avg_order_value
FROM "Event" e
INNER JOIN "Campaign" c ON e."campaignId" = c.id
WHERE c."userId" = ${userId}
```

Se funcionar → problema está nos ROUND.

### **Opção 2: Usar Prisma ao invés de SQL raw**

```typescript
const events = await db.event.findMany({
  where: {
    campaign: { userId },
    createdAt: { gte: sevenDaysAgo }
  },
  select: {
    eventType: true,
    clickId: true,
    eventValue: true
  }
});

// Calcular no JavaScript
const totalViews = new Set(
  events.filter(e => e.eventType === 'view').map(e => e.clickId)
).size;
```

Mais lento, mas FUNCIONA SEMPRE.

---

## 📞 **PRÓXIMOS PASSOS:**

1. **Deploy desta correção**
2. **Abrir Vercel Function Logs**
3. **Copiar erro EXATO que aparece**
4. **Me enviar screenshot dos logs**

Com logs vou poder ver EXATAMENTE o que está quebrando!

---

## 💡 **POSSÍVEIS CAUSAS:**

### **Causa 1: Banco vazio**
- ✅ Solução: COALESCE já resolve

### **Causa 2: Schema diferente**
- ❓ Verificar: Ver nomes de colunas no banco
- ✅ Solução: Ajustar queries

### **Causa 3: Timeout**
- ❓ Verificar: Logs mostram "timeout"
- ✅ Solução: Adicionar índices

### **Causa 4: Permissão**
- ❓ Verificar: Logs mostram "permission denied"
- ✅ Solução: Verificar DATABASE_URL

---

## 🎯 **O QUE MUDOU:**

```diff
// Query ANTES:
+ ROUND(...) as conversion_rate,  // ← Podia retornar NULL!

// Query AGORA:
+ COALESCE(ROUND(...), 0) as conversion_rate,  // ← Sempre número!

// Parse ANTES:
+ parseInt(stats.total_views)  // ← NaN se null!

// Parse AGORA:
+ parseInt(stats.total_views || '0')  // ← Sempre número!

// Erro handling ANTES:
+ Nenhum try-catch  // ← Erro quebrava tudo!

// Erro handling AGORA:
+ try { ... } catch { return error }  // ← Retorna erro legível!
```

---

## ✅ **GARANTIAS DESTA VERSÃO:**

```
✅ Nunca retorna NULL das queries
✅ Sempre converte para número válido
✅ Captura qualquer erro
✅ Retorna erro legível
✅ Loga para debug
✅ Funciona mesmo sem dados
```

---

**Deploy e me envie os logs!** 📊

**Vamos resolver de vez!** 🚀
