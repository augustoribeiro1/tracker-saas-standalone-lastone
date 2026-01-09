// cloudflare-worker-enhanced.js
// Proxy reverso COM suporte para pixels (Meta, Google, TikTok)

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
      
      // 3. Processar HTML para ajustar links E pixels
      let html = await destinationResponse.text();
      const destinationDomain = new URL(destinationUrl).origin;
      const proxyDomain = url.origin;
      
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
      
      // Adicionar base tag
      html = html.replace(
        /<head>/i,
        `<head><base href="${destinationDomain}/">`
      );
      
      // ⭐ INJETAR SCRIPT PARA CORRIGIR PIXELS E TRACKING PARAMS ⭐
      const pixelFixScript = `
<script>
(function() {
  // Salvar URL de destino real para pixels
  window.__REAL_DESTINATION_URL = "${destinationUrl}";
  window.__PROXY_URL = "${url.href}";
  window.__TRACKING_DATA = ${JSON.stringify(data)};

  // ✅ Injetar parâmetros customizados de tracking para o tracking.js
  window.__SPLIT2_TEST_ID__ = ${data.campaignId};
  window.__SPLIT2_VARIATION_ID__ = ${data.variationId};
  window.__SPLIT2_CLICK_ID__ = "${data.clickId}";
  window.__SPLIT2_TRACKING_PARAM_PRIMARY__ = "${data.trackingParamPrimary || 'utm_term'}";
  window.__SPLIT2_TRACKING_PARAM_BACKUP__ = "${data.trackingParamBackup || 'subid'}";
  
  // Interceptar fbq (Meta Pixel) para adicionar URL real
  if (typeof fbq !== 'undefined') {
    const originalFbq = window.fbq;
    window.fbq = function() {
      // Adicionar URL real aos eventos
      if (arguments[0] === 'track' && arguments[2]) {
        arguments[2].real_url = window.__REAL_DESTINATION_URL;
        arguments[2].proxy_url = window.__PROXY_URL;
        arguments[2].variation_id = window.__TRACKING_DATA.variationId;
      }
      return originalFbq.apply(this, arguments);
    };
    // Copiar propriedades
    Object.keys(originalFbq).forEach(key => {
      window.fbq[key] = originalFbq[key];
    });
  }
  
  // Interceptar gtag (Google Analytics/Ads) 
  if (typeof gtag !== 'undefined') {
    const originalGtag = window.gtag;
    window.gtag = function() {
      if (arguments[0] === 'event' && arguments[2]) {
        arguments[2].real_url = window.__REAL_DESTINATION_URL;
        arguments[2].proxy_url = window.__PROXY_URL;
      }
      return originalGtag.apply(this, arguments);
    };
  }
  
  // Interceptar ttq (TikTok Pixel)
  if (typeof ttq !== 'undefined') {
    const originalTtq = window.ttq;
    window.ttq = function() {
      if (arguments[0] === 'track' && arguments[2]) {
        arguments[2].real_url = window.__REAL_DESTINATION_URL;
        arguments[2].proxy_url = window.__PROXY_URL;
      }
      return originalTtq.apply(this, arguments);
    };
  }
})();
</script>`;
      
      // Injetar script ANTES do fechamento do </head> ou início do <body>
      if (html.includes('</head>')) {
        html = html.replace('</head>', pixelFixScript + '</head>');
      } else if (html.includes('<body')) {
        html = html.replace('<body', pixelFixScript + '<body');
      } else {
        // Se não encontrar head nem body, adicionar no início
        html = pixelFixScript + html;
      }
      
      // 4. Retornar HTML mantendo URL original
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Proxied-By': 'Split2',
          'X-Real-Destination': destinationUrl
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
