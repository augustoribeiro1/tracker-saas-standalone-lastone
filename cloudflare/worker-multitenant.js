// cloudflare-worker-multitenant.js
// Proxy reverso UNIVERSAL para subdomínios dos clientes

const SPLIT2_API = 'https://tracker-saas-standalone-lastone.vercel.app';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Verificar se é rota de redirect (/r/*)
  if (url.pathname.startsWith('/r/')) {
    const slug = url.pathname.split('/r/')[1];
    const domain = url.hostname; // track.minhaloja.com
    
    try {
      // 1. Chamar API do Split2 com domínio
      const apiUrl = `${SPLIT2_API}/api/redirect/${slug}${url.search}&domain=${domain}`;
      
      const apiResponse = await fetch(apiUrl, {
        headers: {
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP'),
          'X-Forwarded-Host': domain,
          'User-Agent': request.headers.get('User-Agent'),
          'Referer': request.headers.get('Referer') || ''
        }
      });
      
      if (!apiResponse.ok) {
        return new Response('Campaign not found', { status: 404 });
      }
      
      const data = await apiResponse.json();
      const destinationUrl = data.destinationUrl;
      
      if (!destinationUrl) {
        return new Response('Invalid campaign', { status: 400 });
      }
      
      // 2. Verificar se destino é mesmo domínio raiz
      const destinationDomain = new URL(destinationUrl).hostname;
      const rootDomain = domain.split('.').slice(-2).join('.'); // minhaloja.com
      const destinationRoot = destinationDomain.split('.').slice(-2).join('.');
      
      if (rootDomain !== destinationRoot) {
        console.warn(`Domain mismatch: ${rootDomain} vs ${destinationRoot}`);
        // Permitir, mas logar aviso
      }
      
      // 3. Fazer proxy do conteúdo
      const destinationResponse = await fetch(destinationUrl, {
        headers: {
          'User-Agent': request.headers.get('User-Agent'),
          'Accept': request.headers.get('Accept'),
          'Accept-Language': request.headers.get('Accept-Language'),
          'Cookie': request.headers.get('Cookie') || '' // Compartilhar cookies!
        }
      });
      
      // 4. Processar HTML
      let html = await destinationResponse.text();
      const destinationOrigin = new URL(destinationUrl).origin;
      
      // Ajustar URLs relativas
      html = html.replace(
        /(href|src)=["']\/([^"']*)["']/g,
        `$1="${destinationOrigin}/$2"`
      );
      
      // Base tag para resolver relativos
      html = html.replace(
        /<head>/i,
        `<head><base href="${destinationOrigin}/">`
      );
      
      // ⭐ SCRIPT PARA PIXELS E TRACKING PARAMS
      const trackingScript = `
<script>
// Dados de tracking disponíveis
window.__SPLIT2_TRACKING = ${JSON.stringify({
  clickId: data.clickId,
  variationId: data.variationId,
  variationName: data.variationName,
  campaignId: data.campaignId,
  proxyUrl: url.href,
  destinationUrl: destinationUrl
})};

// ✅ Variáveis para tracking.js
window.__SPLIT2_TEST_ID__ = ${data.campaignId};
window.__SPLIT2_VARIATION_ID__ = ${data.variationId};
window.__SPLIT2_CLICK_ID__ = "${data.clickId}";
window.__SPLIT2_TRACKING_PARAM_PRIMARY__ = "${data.trackingParamPrimary || 'utm_term'}";
window.__SPLIT2_TRACKING_PARAM_BACKUP__ = "${data.trackingParamBackup || 'subid'}";

// Se quiser enviar eventos customizados para Split2
window.Split2 = {
  track: function(eventName, eventData) {
    fetch('${SPLIT2_API}/api/events/track', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        eventType: 'custom',
        eventName: eventName,
        clickId: window.__SPLIT2_TRACKING.clickId,
        campaignId: window.__SPLIT2_TRACKING.campaignId,
        variationId: window.__SPLIT2_TRACKING.variationId,
        eventValue: eventData?.value,
        metadata: eventData
      })
    });
  }
};
</script>`;
      
      if (html.includes('</head>')) {
        html = html.replace('</head>', trackingScript + '</head>');
      }
      
      // 5. Retornar HTML mantendo cookies
      const responseHeaders = new Headers({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Proxied-By': 'Split2',
        'X-Real-Destination': destinationUrl
      });
      
      // Copiar cookies do destino (importante!)
      const setCookie = destinationResponse.headers.get('Set-Cookie');
      if (setCookie) {
        responseHeaders.set('Set-Cookie', setCookie);
      }
      
      return new Response(html, {
        status: 200,
        headers: responseHeaders
      });
      
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response('Proxy error: ' + error.message, { 
        status: 500 
      });
    }
  }
  
  // Outras rotas: passar para origem
  return fetch(request);
}
