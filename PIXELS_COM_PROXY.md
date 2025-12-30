# 🎯 GUIA: PIXELS COM PROXY REVERSO

## ✅ **RESPOSTA RÁPIDA:**

**SIM! Pixels funcionam normalmente com proxy reverso!**

---

## 🔍 **COMO FUNCIONA:**

### **O que acontece:**

```javascript
1. Cloudflare Worker busca HTML
   → HTML tem: <script>fbq('track', 'PageView')</script>

2. Worker retorna HTML para navegador

3. Navegador EXECUTA JavaScript
   → Pixel roda NO NAVEGADOR DO USUÁRIO
   → NÃO no servidor!

4. Pixel dispara normalmente
   → Evento chega no Meta/Google
```

**✅ Pixels FUNCIONAM porque executam no navegador!**

---

## ⚠️ **MAS TEM UM DETALHE:**

### **URL que o pixel captura:**

```javascript
// Pixel vê:
window.location.href = "track.bingostore.com.br/r/caca"

// NÃO vê:
window.location.href = "google.com/produto"
```

**Isso pode causar:**
- ❌ Meta não reconhece domínio
- ❌ Eventos duplicados
- ❌ Atribuição incorreta

---

## ✅ **SOLUÇÕES:**

### **Solução 1: Worker Enhanced (RECOMENDADO)**

Use: `cloudflare/worker-with-pixels.js`

**O que faz:**
- ✅ Injeta script que intercepta pixels
- ✅ Adiciona URL real aos eventos
- ✅ Funciona com Meta, Google, TikTok
- ✅ Pixels recebem dados corretos

**Eventos enviados incluem:**
```javascript
fbq('track', 'PageView', {
  real_url: 'google.com/produto',
  proxy_url: 'track.bingostore.com.br/r/caca',
  variation_id: 2
});
```

---

### **Solução 2: Configurar Meta Pixel**

**Adicionar domínio no Meta Business Manager:**

1. **Business Settings → Data Sources → Pixels**
2. **Selecionar seu pixel**
3. **Settings → Domains**
4. **Add Domain:** `track.bingostore.com.br`
5. **Verify**

**Resultado:**
- ✅ Meta reconhece domínio
- ✅ Eventos aceitos
- ✅ Atribuição funciona

---

### **Solução 3: Server-Side Tracking**

**Meta Conversions API (mais avançado):**

```javascript
// No Split2, após registrar view:
fetch('https://graph.facebook.com/v18.0/SEU_PIXEL_ID/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: [{
      event_name: 'PageView',
      event_time: Math.floor(Date.now() / 1000),
      user_data: {
        client_ip_address: userIP,
        client_user_agent: userAgent,
        fbp: fbpCookie,  // Cookie _fbp
        fbc: fbcCookie   // Cookie _fbc
      },
      event_source_url: 'https://track.bingostore.com.br/r/caca',
      action_source: 'website'
    }],
    access_token: 'SEU_TOKEN'
  })
});
```

**Vantagens:**
- ✅ Funciona mesmo com bloqueadores
- ✅ Tracking 100% preciso
- ✅ iOS 14+ compliant
- ✅ Bypass ad blockers

---

## 📊 **COMPARAÇÃO:**

### **Worker Básico (worker.js):**
```
✅ Pixels disparam
⚠️  URL pode confundir Meta
❌ Precisa configurar domínios
```

### **Worker Enhanced (worker-with-pixels.js):**
```
✅ Pixels disparam
✅ URL real incluída nos eventos
✅ Funciona sem configuração extra
✅ RECOMENDADO!
```

### **Server-Side API:**
```
✅ Máxima precisão
✅ Bypass bloqueadores
❌ Mais complexo
❌ Precisa configurar
```

---

## 🎯 **EXEMPLO PRÁTICO:**

### **Configuração:**

**Página destino (google.com/produto):**
```html
<!-- Meta Pixel -->
<script>
  !function(f,b,e,v,n,t,s){...}(window,document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  
  fbq('init', '123456789');
  fbq('track', 'PageView');
</script>

<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA-XXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA-XXX');
</script>
```

### **O que acontece COM Worker Enhanced:**

```javascript
1. Worker busca HTML de google.com/produto
2. Worker injeta script de interceptação
3. Navegador carrega página
4. Pixels executam
5. Script intercepta fbq() e gtag()
6. Adiciona dados extras:
   {
     real_url: 'google.com/produto',
     proxy_url: 'track.bingostore.com.br/r/caca',
     variation_id: 2
   }
7. Meta/Google recebem evento completo!
```

### **Evento no Meta Events Manager:**

```json
{
  "event_name": "PageView",
  "event_time": 1704067200,
  "user_data": {...},
  "custom_data": {
    "real_url": "google.com/produto",
    "proxy_url": "track.bingostore.com.br/r/caca",
    "variation_id": 2
  }
}
```

**✅ Meta vê URL real!**
**✅ Atribuição funciona!**

---

## 🔧 **TROUBLESHOOTING:**

### **Pixels não disparam:**

**Causa:** Content Security Policy (CSP) bloqueando

**Solução:**
```javascript
// No Worker, adicionar headers:
'Content-Security-Policy': "script-src 'self' 'unsafe-inline' *.facebook.com *.google.com;"
```

---

### **Eventos duplicados:**

**Causa:** Pixel está tanto na origem quanto na página proxeada

**Solução:**
- Remover pixel da origem (Vercel)
- Manter APENAS na página de destino

---

### **Meta não reconhece domínio:**

**Causa:** Domínio não está configurado no Pixel

**Solução:**
1. Business Manager → Pixels → Settings → Domains
2. Add: track.bingostore.com.br
3. Verify

---

## 📈 **TRACKING AVANÇADO:**

### **Capturar conversões:**

**Na página de checkout (destino):**
```html
<script>
  // Quando usuário compra
  fbq('track', 'Purchase', {
    value: 99.90,
    currency: 'BRL',
    content_ids: ['produto-123'],
    // Worker Enhanced adiciona automaticamente:
    // real_url: 'loja.com/checkout',
    // proxy_url: 'track.bingostore.com.br/r/produto',
    // variation_id: 2
  });
</script>
```

**Split2 também captura via webhook:**
```javascript
// Webhook Kiwify/Hotmart envia para Split2
POST /api/webhooks/kiwify/TOKEN
{
  "order_id": "123",
  "product": "produto-123",
  "value": 99.90,
  "utm_term": "T1-V2-abc123"  ← Split2 identifica variação!
}
```

**Resultado:**
- ✅ Meta vê conversão (client-side)
- ✅ Split2 vê conversão (server-side)
- ✅ Atribuição dupla = máxima precisão!

---

## 🎯 **RECOMENDAÇÕES:**

### **Para Meta Ads:**
```
1. ✅ Usar Worker Enhanced
2. ✅ Adicionar domínio no Pixel Settings
3. ✅ Manter Pixel na página destino
4. ✅ Configurar Conversions API (opcional)
```

### **Para Google Ads:**
```
1. ✅ Usar Worker Enhanced
2. ✅ Google Tag Manager na página destino
3. ✅ Enhanced Conversions habilitado
4. ✅ Importar conversões do Split2
```

### **Para TikTok Ads:**
```
1. ✅ Usar Worker Enhanced
2. ✅ TikTok Pixel na página destino
3. ✅ Events API configurado (opcional)
```

---

## ✅ **CHECKLIST:**

```
☐ Deploy Worker Enhanced
☐ Testar pixel dispara (F12 → Network → fbevents.js)
☐ Verificar evento no Meta Events Manager
☐ Adicionar domínio no Pixel Settings
☐ Testar conversão end-to-end
☐ Verificar atribuição no Meta Ads
☐ Configurar webhooks no Split2
☐ Comparar conversões (Pixel vs Webhook)
```

---

## 💡 **RESUMO:**

**PERGUNTA:**
> Pixels vão disparar com proxy reverso?

**RESPOSTA:**
> ✅ SIM! Pixels executam no navegador, não no servidor!

**MAS:**
> ⚠️  URL pode confundir plataformas

**SOLUÇÃO:**
> ✅ Worker Enhanced injeta URL real nos eventos
> ✅ Configurar domínio no Meta Business Manager
> ✅ Opcional: Server-Side API para máxima precisão

---

## 🚀 **PRÓXIMOS PASSOS:**

```
1. Deploy Split2 com /api/redirect
2. Deploy Worker Enhanced (worker-with-pixels.js)
3. Testar pixel dispara
4. Adicionar domínio no Meta
5. Testar conversão completa
6. ✅ Tracking 100% funcional!
```

---

## 🎉 **CONCLUSÃO:**

**Proxy reverso É compatível com pixels!**

**Worker Enhanced torna tudo perfeito!**

**É assim que os profissionais fazem!** 💪
