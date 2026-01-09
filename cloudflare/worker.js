// cloudflare-worker.js
// Proxy reverso para mascarar redirects e evitar ban em Meta/Google Ads

// URL da sua API Split2
const SPLIT2_API = 'https://tracker-saas-standalone-lastone.vercel.app';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Verificar se é rota de redirect (/r/*)
  if (url.pathname.startsWith('/r/')) {
    const slug = url.pathname.split('/r/')[1];
    
    try {
      // 1. Chamar API do Split2 para obter URL de destino
      const apiUrl = `${SPLIT2_API}/api/redirect/${slug}${url.search}`;
      
      const apiResponse = await fetch(apiUrl, {
        headers: {
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP'),
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
      
      // 2. Fazer proxy do conteúdo da URL de destino
      const destinationResponse = await fetch(destinationUrl, {
        headers: {
          'User-Agent': request.headers.get('User-Agent'),
          'Accept': request.headers.get('Accept'),
          'Accept-Language': request.headers.get('Accept-Language')
        }
      });
      
      // 3. Processar HTML para ajustar links relativos
      let html = await destinationResponse.text();
      const destinationDomain = new URL(destinationUrl).origin;
      
      // Reescrever URLs relativas para absolutas
      html = html.replace(
        /(href|src)=["']\/([^"']*)["']/g,
        `$1="${destinationDomain}/$2"`
      );
      
      // Reescrever URLs relativas sem barra
      html = html.replace(
        /(href|src)=["'](?!http|\/\/|#)([^"']+)["']/g,
        (match, attr, path) => {
          const base = destinationUrl.replace(/\/[^\/]*$/, '/');
          return `${attr}="${base}${path}"`;
        }
      );
      
      // Adicionar base tag para resolver caminhos relativos
      html = html.replace(
        /<head>/i,
        `<head><base href="${destinationDomain}/">`
      );

      // ✅ Injetar variáveis globais para tracking.js
      const trackingScript = `
<script>
  window.__SPLIT2_TEST_ID__ = ${data.campaignId};
  window.__SPLIT2_VARIATION_ID__ = ${data.variationId};
  window.__SPLIT2_CLICK_ID__ = "${data.clickId}";
  window.__SPLIT2_TRACKING_PARAM_PRIMARY__ = "${data.trackingParamPrimary || 'utm_term'}";
  window.__SPLIT2_TRACKING_PARAM_BACKUP__ = "${data.trackingParamBackup || 'subid'}";
</script>`;

      if (html.includes('</head>')) {
        html = html.replace('</head>', trackingScript + '</head>');
      } else if (html.includes('<body')) {
        html = html.replace('<body', trackingScript + '<body');
      }

      // 4. Retornar HTML mantendo URL original
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Proxied-By': 'Split2'
        }
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
