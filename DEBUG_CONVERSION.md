# 🔍 DEBUG - CONVERSÃO SECUNDÁRIA NÃO REGISTRA

## 🚨 **PROBLEMA:**

```
✅ URL /c/slug redireciona corretamente
❌ Conversão secundária NÃO aparece no analytics
✅ Views continuam sendo registradas normalmente
```

---

## 🔧 **CAUSA IDENTIFICADA:**

### **Código ANTES tinha lógica restritiva:**

```typescript
// ANTES:
let variationId: number | null = null;

if (existingUtmTerm) {
  // Busca variação original pelo utm_term
  variationId = originalEvent?.variationId;
}

// REGISTRA APENAS SE TEM VARIATIONID!
if (variationId) {  // ← PROBLEMA!
  await db.event.create({...});
}
```

**Problema:**
```
Sem utm_term → variationId fica null → Não registra! ❌
```

---

## ✅ **SOLUÇÃO APLICADA:**

### **1. Buscar variação mesmo sem utm_term:**

```typescript
// Se não encontrou variationId, pegar primeira variação
if (!variationId) {
  const firstVariation = await db.variation.findFirst({
    where: { campaignId: campaign.id },
    select: { id: true }
  });
  
  if (firstVariation) {
    variationId = firstVariation.id;
    console.log('[Conversion] Using first variation:', { variationId });
  }
}
```

### **2. Log adicional para debug:**

```typescript
if (variationId) {
  // Registra conversão
  console.log('[Conversion] Secondary conversion registered!');
} else {
  // Aviso se não conseguir variação
  console.warn('[Conversion] Could not find variation!');
}
```

---

## 📋 **COMO TESTAR:**

### **Teste 1: COM utm_term (fluxo completo)**

```
1. Acessar: https://track.site.com/r/buzios
   → Sistema adiciona utm_term automaticamente
   
2. Página carrega com utm_term na URL:
   https://minhapagina.com?utm_term=abc123xyz
   
3. Botão "Comprar" deve ter utm_term:
   <a href="https://track.site.com/c/buzios?utm_term=abc123xyz">
   
4. Clicar no botão
   
5. Ver logs no Vercel:
   ✅ [Conversion] Returning visitor: { clickId: 'abc123xyz', variationId: 1 }
   ✅ [Conversion] Secondary conversion registered!
   
6. Ver Analytics:
   ✅ Conv. Secundária: 1
```

### **Teste 2: SEM utm_term (acesso direto)**

```
1. Acessar diretamente:
   https://track.site.com/c/buzios
   
2. Ver logs no Vercel:
   ⚠️  [Conversion] New visitor without tracking
   ✅ [Conversion] Using first variation: { variationId: 1 }
   ✅ [Conversion] Secondary conversion registered!
   
3. Ver Analytics:
   ✅ Conv. Secundária: 1
```

---

## 🔍 **VERIFICAR LOGS NO VERCEL:**

```
1. Vercel Dashboard
2. Projeto → Deployments
3. Último deploy → "View Function Logs"
4. Filtrar por: [Conversion]
5. Ver logs:

Esperado:
✅ [Conversion] Campaign found
✅ [Conversion] Returning visitor OU New visitor
✅ [Conversion] Using first variation (se sem utm_term)
✅ [Conversion] Secondary conversion registered!

Se aparecer:
❌ [Conversion] Could not find variation
→ Significa que campanha não tem variações!
```

---

## 🎯 **EXEMPLO CÓDIGO NA PÁGINA DE VENDAS:**

### **HTML Simples:**

```html
<script>
  // Captura utm_term da URL
  const params = new URLSearchParams(window.location.search);
  const utmTerm = params.get('utm_term');
  
  // Atualiza todos os botões de compra
  document.querySelectorAll('.btn-comprar').forEach(btn => {
    const baseUrl = 'https://track.autocomtecnologia.com.br/c/buzios';
    btn.href = utmTerm 
      ? `${baseUrl}?utm_term=${utmTerm}`
      : baseUrl;
  });
</script>

<a href="#" class="btn-comprar">
  COMPRAR AGORA
</a>
```

### **React/Next.js:**

```tsx
import { useSearchParams } from 'next/navigation';

export default function BuyButton() {
  const searchParams = useSearchParams();
  const utmTerm = searchParams.get('utm_term');
  
  const conversionUrl = `https://track.site.com/c/buzios${
    utmTerm ? `?utm_term=${utmTerm}` : ''
  }`;
  
  return (
    <a href={conversionUrl}>
      COMPRAR AGORA
    </a>
  );
}
```

### **WordPress/PHP:**

```php
<?php
$utm_term = isset($_GET['utm_term']) ? $_GET['utm_term'] : '';
$conversion_url = 'https://track.site.com/c/buzios';
if ($utm_term) {
    $conversion_url .= '?utm_term=' . urlencode($utm_term);
}
?>

<a href="<?php echo $conversion_url; ?>">
  COMPRAR AGORA
</a>
```

---

## 🚨 **CHECKLIST DE PROBLEMAS:**

### **1. Conversão não registra:**

```
☑️ Campanha tem flag ativada?
☑️ Campanha tem checkout URL configurada?
☑️ Campanha tem pelo menos 1 variação?
☑️ Middleware permite /c/*?
☑️ Logs mostram "registered"?
```

### **2. Analytics zerado:**

```
☑️ Evento foi criado no banco?
☑️ Query de analytics busca eventType='conversion'?
☑️ Query filtra por eventName='checkout_click'?
☑️ Data está dentro do período selecionado?
```

### **3. Redirect não funciona:**

```
☑️ URL do checkout está preenchida?
☑️ URL do checkout tem https://?
☑️ Middleware permite /c/*?
☑️ Campanha está ativa (status='active')?
```

---

## 📊 **QUERY MANUAL PARA VERIFICAR:**

```sql
-- Ver eventos de conversão criados
SELECT 
  e.id,
  e."clickId",
  e."eventType",
  e."eventName",
  e."createdAt",
  c.name as campaign_name,
  v.name as variation_name
FROM "Event" e
INNER JOIN "Campaign" c ON e."campaignId" = c.id
INNER JOIN "Variation" v ON e."variationId" = v.id
WHERE e."eventType" = 'conversion'
  AND e."eventName" = 'checkout_click'
ORDER BY e."createdAt" DESC
LIMIT 10;
```

---

## 🎯 **FLUXO ESPERADO:**

```
VISITANTE NOVO (SEM TRACKING):
1. Acessa: /c/buzios
2. Sistema: "Não tem utm_term"
3. Sistema: "Pega primeira variação"
4. Sistema: "Cria clickId novo"
5. Sistema: "Registra conversão" ✅
6. Redirect: checkout

VISITANTE RETORNANDO (COM TRACKING):
1. Veio de: /r/buzios → minhapagina.com?utm_term=abc
2. Clica: /c/buzios?utm_term=abc
3. Sistema: "Tem utm_term!"
4. Sistema: "Busca variação original"
5. Sistema: "Usa mesma variação da view"
6. Sistema: "Registra conversão" ✅
7. Redirect: checkout?utm_term=abc
```

---

## 💡 **DICAS:**

### **1. Sempre propagar utm_term:**
```javascript
// ✅ BOM:
href="https://track.site.com/c/buzios?utm_term=abc123"

// ❌ RUIM (mas agora funciona):
href="https://track.site.com/c/buzios"
```

### **2. Verificar no console do navegador:**
```javascript
// Na página de vendas:
console.log('utm_term:', new URLSearchParams(location.search).get('utm_term'));
```

### **3. Testar ambos os fluxos:**
- Com utm_term (fluxo normal)
- Sem utm_term (acesso direto)

---

## 🚀 **DEPLOY DESTA CORREÇÃO:**

```powershell
cd D:\splitter\tracker-saas-standalone-lastone
git add .
git commit -m "Fix: Always register conversion even without utm_term"
git push
```

---

## ✅ **APÓS DEPLOY:**

```
1. Acessar: https://track.site.com/c/buzios
2. Ver se redireciona ✅
3. Verificar logs Vercel
4. Ver Analytics da campanha
5. ✅ Conv. Secundária deve aumentar!
```

---

## 📞 **SE AINDA NÃO FUNCIONAR:**

```
1. Copiar logs completos do Vercel
2. Executar query SQL acima
3. Screenshot do analytics
4. Informações:
   - URL testada
   - Tinha utm_term?
   - Logs do Vercel
   - Resultado da query
```

---

**Agora deve funcionar mesmo sem utm_term!** ✅

**Sistema mais robusto e tolerante a falhas!** 💪

**Deploy e teste novamente!** 🚀
