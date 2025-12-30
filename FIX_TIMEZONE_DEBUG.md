# 🔧 FIX: ANALYTICS MOSTRA 0 (MAS EVENTOS EXISTEM!)

## ✅ **BOA NOTÍCIA:**

**Eventos ESTÃO sendo criados!** Vimos nos logs:

```
[Redirect] Event created: { clickId: 't1Bz4uzGevhdtpeh', campaignId: 7, variationId: 14 }
[Redirect] Event created: { clickId: 'fXqh4e84ty4ejrxa', campaignId: 7, variationId: 14 }
[Redirect] Event created: { clickId: 'y6vgxxqq9a3b38d7', campaignId: 7, variationId: 13 }
[Redirect] Event created: { clickId: 'gnn6f1i76ibw3vda', campaignId: 7, variationId: 14 }
```

✅ Split funcionando (variationId 13 e 14)  
✅ CampaignId correto (7)  
✅ ClickIds únicos

---

## 🐛 **PROBLEMA:**

**Analytics mostra 0 views, mas eventos existem no banco!**

### **Causa Provável: TIMEZONE!**

**Código ANTES:**
```typescript
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const endDate = new Date().toISOString();
```

**Problemas:**
1. `.toISOString()` retorna UTC
2. Eventos criados podem estar em timezone diferente
3. Filtro pode excluir eventos de "hoje"

### **Exemplo do Problema:**

```
Servidor Vercel: America/New_York (UTC-5)
Evento criado: 2025-12-30 16:50:00 (horário local)
Banco PostgreSQL: 2025-12-30 21:50:00 UTC

Query com endDate: 2025-12-30 16:50:00 UTC
Evento no banco: 2025-12-30 21:50:00 UTC

Resultado: Evento NÃO incluído! ❌
```

---

## ✅ **SOLUÇÃO 1: FIX DE TIMEZONE**

### **Código AGORA:**

```typescript
// Datas padrão: últimos 30 dias
const defaultStartDate = new Date();
defaultStartDate.setDate(defaultStartDate.getDate() - 30);
defaultStartDate.setHours(0, 0, 0, 0);  // ← Início do dia

const defaultEndDate = new Date();
defaultEndDate.setHours(23, 59, 59, 999);  // ← Fim do dia

const startDate = defaultStartDate.toISOString();
const endDate = defaultEndDate.toISOString();

console.log('[Analytics] Fetching from', startDate, 'to', endDate);
```

**Vantagens:**
- ✅ Inclui DIA INTEIRO de hoje
- ✅ Último segundo de hoje incluído
- ✅ Logs para debug

---

## ✅ **SOLUÇÃO 2: ENDPOINT DE DEBUG**

### **NOVO: `/api/campaigns/7/debug`**

Ver TODOS os eventos sem filtro de data!

```javascript
GET https://seu-app.vercel.app/api/campaigns/7/debug
```

**Retorna:**
```json
{
  "campaignId": 7,
  "totalEvents": 4,
  "events": [
    {
      "id": 123,
      "clickId": "t1Bz4uzGevhdtpeh",
      "eventType": "view",
      "variationId": 14,
      "createdAt": "2025-12-30T21:50:38.000Z"
    },
    ...
  ],
  "countByVariation": [
    { "variationId": 13, "_count": { "id": 1 } },
    { "variationId": 14, "_count": { "id": 3 } }
  ],
  "serverTime": "2025-12-30T21:56:00.000Z",
  "timezone": "America/New_York"
}
```

**Use para:**
- ✅ Ver se eventos existem no banco
- ✅ Ver timestamps exatos
- ✅ Ver timezone do servidor
- ✅ Confirmar contagem por variação

---

## 🚀 **DEPLOY:**

```powershell
cd D:\splitter\tracker-saas-standalone-lastone
git add .
git commit -m "Fix: Analytics timezone + debug endpoint"
git push
```

**Aguarde 3 minutos...**

---

## ✅ **TESTAR:**

### **1. Endpoint de Debug:**

```
https://seu-app.vercel.app/api/campaigns/7/debug
```

**Deve mostrar:**
- ✅ `totalEvents: 4` (ou mais)
- ✅ `countByVariation` com dados
- ✅ `events` array com registros

**Se mostrar 0:**
- ❌ Eventos não estão no banco
- ❌ CampaignId errado
- Problema mais sério

**Se mostrar dados:**
- ✅ Eventos EXISTEM!
- ✅ Problema é só no filtro de data
- ✅ Fix de timezone vai resolver

---

### **2. Analytics (após fix timezone):**

```
Dashboard → Campanhas → Analytics
```

**Deve mostrar:**
- ✅ Total de Views: 4
- ✅ Variação A: X views
- ✅ Variação B: Y views

---

### **3. Verificar Logs:**

```
Vercel → Functions → /api/campaigns/[id]/analytics

Procurar:
[Analytics] Fetching data for campaign 7 from ... to ...
[Analytics] Metrics fetched: 2 variations
[Analytics] Sample metric: { variation_id: 13, views: 1, ... }
```

**Se metrics mostrar views: 0:**
- Problema ainda existe
- Me enviar logs completos

**Se metrics mostrar views: 4:**
- ✅ Query funcionando!
- ✅ Frontend deve atualizar

---

## 🐛 **SE AINDA DER PROBLEMA:**

### **Verificar no endpoint debug:**

1. **Timezone do servidor:**
   ```json
   "timezone": "America/Sao_Paulo"  // ou UTC, ou America/New_York
   ```

2. **Timestamps dos eventos:**
   ```json
   "createdAt": "2025-12-30T19:50:38.000Z"  // ← Nota o Z (UTC)
   ```

3. **Total de eventos:**
   ```json
   "totalEvents": 4  // ← Deve bater com quantidade de acessos
   ```

---

## 📊 **ARQUIVOS MODIFICADOS:**

```
✅ app/api/campaigns/[id]/analytics/route.ts
   → Fix timezone (setHours 0 e 23:59)
   → Logs de debug

✅ app/api/campaigns/[id]/debug/route.ts
   → NOVO! Endpoint de debug
   → Ver todos eventos sem filtro
```

---

## 💡 **POR QUE TIMEZONE É COMPLICADO:**

### **Problema:**

```
Você acessa: 30/12/2025 16:50 (Brasília)
Banco salva: 30/12/2025 19:50 UTC
Query busca: até 30/12/2025 16:50 UTC
Resultado: Evento não encontrado! ❌
```

### **Solução:**

```
Query busca: até 30/12/2025 23:59:59.999 (hoje)
Converter: 31/12/2025 02:59:59.999 UTC
Banco tem: 30/12/2025 19:50 UTC
Resultado: Evento encontrado! ✅
```

---

## 🎯 **RESUMO:**

**PROBLEMA:**
- ✅ Eventos criados no banco
- ❌ Analytics não mostra (filtro de data errado)

**SOLUÇÃO 1:**
- ✅ Fix timezone (dia inteiro incluído)

**SOLUÇÃO 2:**
- ✅ Debug endpoint (ver dados reais)

**RESULTADO:**
- ✅ Analytics vai funcionar!

---

**Deploy e teste o endpoint /debug primeiro!** 📞

**Me envie o resultado do /debug!** 🐛

**Depois analytics vai funcionar!** 🎉
