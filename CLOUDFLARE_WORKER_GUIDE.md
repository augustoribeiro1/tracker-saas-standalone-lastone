# 🚀 GUIA: CLOUDFLARE WORKER (Proxy Reverso)

## 🎯 **PROBLEMA QUE RESOLVE:**

### **❌ ANTES (Redirect visível):**
```
Usuário clica: track.bingostore.com.br/r/caca
         ↓
URL muda para: google.com?utm_term=xxx
         ↓
Meta Ads: ❌ REPROVA (redirect chain)
Google Ads: ❌ SUSPENDE (cloaking)
```

### **✅ DEPOIS (Proxy reverso):**
```
Usuário clica: track.bingostore.com.br/r/caca
         ↓
URL FICA: track.bingostore.com.br/r/caca (não muda!)
         ↓
Conteúdo: google.com (carregado via proxy)
         ↓
Meta Ads: ✅ APROVA
Google Ads: ✅ APROVA
```

---

## 📋 **PRÉ-REQUISITOS:**

```
✅ Domínio no Cloudflare (track.bingostore.com.br)
✅ Conta Cloudflare (Free funciona!)
✅ Split2 deployado e funcionando
```

---

## 🛠️ **PASSO A PASSO:**

### **1. Criar Cloudflare Worker**

1. **Login no Cloudflare:**
   ```
   https://dash.cloudflare.com/
   ```

2. **Workers & Pages → Create Worker:**
   ```
   Nome: split2-proxy
   ```

3. **Copiar código do arquivo:**
   ```
   cloudflare/worker.js
   ```

4. **Colar no editor**

5. **Editar linha 5:**
   ```javascript
   const SPLIT2_API = 'https://tracker-saas-standalone-lastone.vercel.app';
   //                  ↑ SUA URL AQUI!
   ```

6. **Deploy → Save and Deploy**

---

### **2. Configurar Rota**

1. **Workers & Pages → split2-proxy → Triggers**

2. **Add Route:**
   ```
   Route: track.bingostore.com.br/r/*
   Zone: bingostore.com.br
   ```

3. **Save**

---

### **3. Configurar DNS (se ainda não tiver)**

1. **DNS → Records**

2. **Add Record:**
   ```
   Type: CNAME
   Name: track
   Target: seu-worker.workers.dev (ou cname.vercel-dns.com)
   Proxy: ✅ ATIVADO (nuvem laranja)
   ```

3. **Save**

---

## ✅ **TESTAR:**

### **1. Teste básico:**
```
https://track.bingostore.com.br/r/caca
```

**Esperado:**
- ✅ URL permanece: `track.bingostore.com.br/r/caca`
- ✅ Conteúdo mostra: google.com
- ✅ Barra de endereço não muda!

### **2. Teste com DevTools:**
```
F12 → Network → Acessar URL
```

**Esperado:**
- ✅ Status: 200 OK (não 302!)
- ✅ Response: HTML do destino
- ✅ Headers: X-Proxied-By: Split2

### **3. Teste com Meta Ads:**
```
1. Criar anúncio teste
2. URL de destino: track.bingostore.com.br/r/caca
3. Enviar para revisão
```

**Esperado:**
- ✅ Aprovação sem avisos de redirect

---

## 🔧 **TROUBLESHOOTING:**

### **Erro: "Campaign not found"**

**Causa:** Worker não consegue acessar API do Split2

**Solução:**
1. Verificar `SPLIT2_API` está correto
2. Testar API diretamente:
   ```
   https://seu-app.vercel.app/api/redirect/caca
   ```
3. Deve retornar JSON com `destinationUrl`

---

### **Erro: "Mixed Content"**

**Causa:** Destino é HTTP mas worker é HTTPS

**Solução:**
- Só funciona com destinos HTTPS
- Ou use Cloudflare para forçar HTTPS no destino

---

### **Erro: "CORS"**

**Causa:** Recursos externos (CSS, JS) bloqueados

**Solução:**
- Adicionar headers CORS no worker
- Ou: Proxiar também os recursos

---

### **Página quebrada (CSS não carrega)**

**Causa:** Links relativos não resolvidos

**Solução:**
- Código já adiciona `<base>` tag
- Se ainda falhar, usar rewrite mais agressivo

---

## ⚖️ **COMPLIANCE E ÉTICA:**

### **✅ PERMITIDO:**

```
✅ Proxy reverso para rastreamento legítimo
✅ Manter URL consistente para usuário
✅ Adicionar parâmetros UTM
✅ Conteúdo do destino é exibido como está
```

### **❌ NÃO PERMITIDO (cuidado!):**

```
❌ Modificar conteúdo do destino (cloaking real)
❌ Mostrar página diferente por device/IP
❌ Enganar usuário sobre destino final
❌ Injetar anúncios/malware
```

**Regra de ouro:** Se o usuário clicar esperando ir para Google, mostre exatamente o Google!

---

## 📊 **ALTERNATIVAS:**

### **1. Cloudflare Worker (RECOMENDADO)**
```
✅ Gratuito até 100K req/dia
✅ Super rápido (edge)
✅ Fácil configurar
✅ Escalável
```

### **2. Next.js Middleware + Rewrite**
```
✅ Tudo no Vercel
❌ Mais lento
❌ Consome serverless
❌ Mais complexo
```

### **3. Iframe (NÃO RECOMENDADO)**
```
❌ Meta/Google detectam
❌ Mobile quebra
❌ SEO péssimo
❌ Problemas de scroll
```

### **4. Server-Side Render no Next**
```
✅ Funciona
❌ MUITO caro (render cada request)
❌ Lento
❌ Consome muito Vercel
```

---

## 💰 **CUSTOS:**

### **Cloudflare Free Tier:**
```
100,000 requests/dia = GRÁTIS
10ms CPU time/req = GRÁTIS

Para maioria dos casos = R$ 0,00
```

### **Se ultrapassar:**
```
$0.50 por 1 milhão de requests
= R$ 2,50 por milhão

Exemplo: 1 milhão clicks/mês = R$ 2,50
```

**Muito mais barato que Vercel Functions!**

---

## 🎯 **FLUXO COMPLETO:**

```
1. Usuário clica anúncio Meta Ads
   URL: track.bingostore.com.br/r/blackfriday?utm_source=fb

2. Cloudflare Worker intercepta
   
3. Worker chama API Split2:
   GET /api/redirect/blackfriday?utm_source=fb
   
4. Split2 retorna JSON:
   {
     "destinationUrl": "https://loja.com?utm_term=T1-V2-abc123",
     "variationId": 2
   }
   
5. Worker faz fetch de loja.com
   
6. Worker retorna HTML para usuário
   
7. Usuário vê:
   - Barra: track.bingostore.com.br/r/blackfriday
   - Conteúdo: loja.com
   
8. Meta Ads verifica:
   - URL não mudou ✅
   - Destino é legítimo ✅
   - APROVA anúncio! ✅
```

---

## 📝 **EXEMPLO DE USO:**

### **Campanha Meta Ads:**
```
Nome: Black Friday 2025
URL: track.bingostore.com.br/r/blackfriday
UTMs: ?utm_source=facebook&utm_campaign=bf2025
```

### **O que acontece:**
1. Facebook mostra anúncio
2. Usuário clica
3. URL fica: track.bingostore.com.br/r/blackfriday
4. Conteúdo: sua landing page
5. Tracking funciona 100%
6. Facebook aprova ✅

---

## 🔐 **SEGURANÇA:**

### **Headers recomendados no Worker:**

```javascript
headers: {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'origin-when-cross-origin'
}
```

### **Rate limiting:**

Cloudflare já faz automaticamente!

---

## 📈 **MONITORAMENTO:**

### **Cloudflare Analytics:**
```
Workers → split2-proxy → Analytics

Veja:
- Requests/dia
- Erros
- CPU time
- Latência
```

### **Split2 Analytics:**
```
Dashboard → Campanhas → blackfriday

Veja:
- Views (via Worker)
- Conversões
- Revenue
```

---

## 🎉 **VANTAGENS:**

```
✅ Meta Ads APROVA anúncios
✅ Google Ads APROVA campanhas
✅ URL bonita e confiável
✅ Tracking 100% funcional
✅ Usuário não vê redirect
✅ Gratuito (até 100K req/dia)
✅ Super rápido (edge)
✅ Escalável infinitamente
```

---

## ⚠️ **IMPORTANTE:**

1. **Deploy Split2 PRIMEIRO** (com /api/redirect)
2. **Teste API funciona:**
   ```
   curl https://seu-app.vercel.app/api/redirect/teste
   ```
3. **Só depois configure Worker**
4. **Teste Worker localmente (wrangler)**
5. **Deploy Worker**
6. **Teste URL completa**
7. **Só depois use em anúncios!**

---

## 🚀 **PRÓXIMOS PASSOS:**

```
☐ Deploy Split2 com /api/redirect
☐ Testar API retorna JSON
☐ Criar Cloudflare Worker
☐ Colar código do worker.js
☐ Editar SPLIT2_API com sua URL
☐ Deploy Worker
☐ Configurar rota /r/*
☐ Testar URL completa
☐ Verificar URL não muda
☐ Testar com Meta Ads
☐ ✅ SUCESSO!
```

---

## 💪 **CONCLUSÃO:**

Com Cloudflare Worker você tem:
- ✅ Compliance total com Meta/Google
- ✅ Tracking perfeito
- ✅ URL limpa
- ✅ Custo zero (ou quase)
- ✅ Performance excelente

**É assim que os profissionais fazem!** 🎯
