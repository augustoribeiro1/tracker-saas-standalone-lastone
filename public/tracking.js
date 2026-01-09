/**
 * Split2 Universal Tracking Script - VERSÃO FINAL
 * Preserva UTMs do tráfego + parâmetros especiais + adiciona tracking code
 */

(function() {
  'use strict';

  console.log('[Split2 Tracking] 🚀 Script iniciado!');

  const CLICKID_PREFIX = 'split2_';
  const COOKIE_NAME = 'split2_tracking';
  const COOKIE_DAYS = 30;

  /**
   * Salva tracking no cookie
   */
  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + '=' + value + '; expires=' + date.toUTCString() + '; path=/';
  }

  /**
   * Gera clickId único (fallback)
   */
  function generateClickId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * ✅ CAPTURA TODOS OS PARÂMETROS DA URL DO TRÁFEGO
   */
  function getTrafficParams() {
    const params = new URLSearchParams(window.location.search);
    const trafficParams = {};

    // Lista de parâmetros importantes do tráfego
    const importantParams = [
      // UTMs padrão
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      // utm_term e subid serão IGNORADOS (substituídos pelo Split2)
      
      // Parâmetros do Google Ads
      'gclid',      // Google Click ID
      'gclsrc',     // Google Click Source
      'gbraid',     // Google Brand ID
      'wbraid',     // Google Web Brand ID
      
      // Parâmetros do Facebook/Meta
      'fbclid',     // Facebook Click ID
      'fbadid',     // Facebook Ad ID
      
      // Parâmetros do TikTok
      'ttclid',     // TikTok Click ID
      
      // Parâmetros do Microsoft/Bing
      'msclkid',    // Microsoft Click ID
      
      // Parâmetros do Twitter/X
      'twclid',     // Twitter Click ID
      
      // Parâmetros do LinkedIn
      'li_fat_id',  // LinkedIn First Party Ad Tracking
      
      // Parâmetros do Taboola
      'tblci',      // Taboola Click ID
      
      // Parâmetros do Outbrain
      'obOrigUrl',  // Outbrain Original URL
      
      // Outros parâmetros comuns
      'ref',        // Referrer
      'source',     // Source alternativo
      'campaign',   // Campaign alternativo
    ];

    // Capturar todos os parâmetros importantes
    importantParams.forEach(param => {
      if (params.has(param)) {
        trafficParams[param] = params.get(param);
      }
    });

    // ⚠️ IMPORTANTE: REMOVER utm_term e subid se existirem (serão substituídos pelo Split2)
    delete trafficParams.utm_term;
    delete trafficParams.subid;

    console.log('[Split2 Tracking] 📊 Parâmetros do tráfego capturados:', trafficParams);
    
    return trafficParams;
  }

  try {
    // ✅ 1. CAPTURAR DADOS INJETADOS PELO WORKER
    const testId = window.__SPLIT2_TEST_ID__ || null;
    const variationId = window.__SPLIT2_VARIATION_ID__ || null;
    const apiClickId = window.__SPLIT2_CLICK_ID__ || null;

    console.log('[Split2 Tracking] 📋 Dados do Split2:', {
      testId,
      variationId,
      apiClickId
    });

    if (!testId || !variationId) {
      console.error('[Split2 Tracking] ❌ testId ou variationId ausentes!');
      return;
    }

    // ✅ 2. DEFINIR CLICKID (API ou gerar novo)
    let clickId;
    if (apiClickId) {
      clickId = apiClickId;
      console.log('[Split2 Tracking] ✅ Usando clickId da API:', clickId);
    } else {
      clickId = generateClickId();
      console.log('[Split2 Tracking] ⚠️ Gerado novo clickId:', clickId);
    }

    // ✅ 3. ADICIONAR PREFIXO split2_
    const clickIdWithPrefix = CLICKID_PREFIX + clickId;

    // ✅ 4. MONTAR TRACKING CODE
    const trackingCode = `${testId}-${variationId}-${clickIdWithPrefix}`;
    console.log('[Split2 Tracking] 📝 Tracking code:', trackingCode);

    // ✅ 5. CAPTURAR PARÂMETROS DO TRÁFEGO
    const trafficParams = getTrafficParams();

    // ✅ 6. SALVAR NO COOKIE
    setCookie(COOKIE_NAME, trackingCode, COOKIE_DAYS);

    // ✅ 7. EXPOR GLOBALMENTE
    window.__SPLIT2_TRACKING__ = {
      testId: testId,
      variationId: variationId,
      clickId: clickIdWithPrefix,
      trackingCode: trackingCode,
      trafficParams: trafficParams
    };

    console.log('[Split2 Tracking] 🌐 Dados expostos:', window.__SPLIT2_TRACKING__);

    // ✅ 8. ADICIONAR TRACKING AOS LINKS
    function addTrackingToLinks() {
      const links = document.querySelectorAll('a[href]');
      let count = 0;

      links.forEach(link => {
        const href = link.getAttribute('href');
        
        // Ignorar links especiais
        if (!href || 
            href.startsWith('#') || 
            href.startsWith('javascript:') || 
            href.startsWith('mailto:') || 
            href.startsWith('tel:')) {
          return;
        }

        // Apenas links externos ou relativos
        const isExternal = href.startsWith('http://') || href.startsWith('https://');
        const isRelative = href.startsWith('/') || !href.includes('://');

        if (isExternal || isRelative) {
          try {
            const url = new URL(href, window.location.origin);
            
            // ✅ ADICIONAR TODOS OS PARÂMETROS DO TRÁFEGO
            Object.keys(trafficParams).forEach(key => {
              // Não sobrescrever se já existir no link
              if (!url.searchParams.has(key)) {
                url.searchParams.set(key, trafficParams[key]);
              }
            });

            // ✅ ADICIONAR utm_term (tracking code do Split2 - PRINCIPAL)
            // SEMPRE sobrescrever utm_term (mesmo se já existir)
            url.searchParams.set('utm_term', trackingCode);

            // ✅ ADICIONAR subid (tracking code do Split2 - BACKUP)
            // SEMPRE sobrescrever subid (mesmo se já existir)
            url.searchParams.set('subid', trackingCode);
            
            // Atualizar link
            link.setAttribute('href', url.toString());
            count++;
          } catch (e) {
            console.warn('[Split2 Tracking] ⚠️ Erro:', href, e);
          }
        }
      });

      console.log('[Split2 Tracking] ✅ Links atualizados:', count);
      
      if (count === 0) {
        console.log('[Split2 Tracking] Tentando novamente em 1s...');
        setTimeout(addTrackingToLinks, 1000);
      }

      return count;
    }

    // ✅ 9. EXECUTAR QUANDO DOM ESTIVER PRONTO
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addTrackingToLinks);
    } else {
      addTrackingToLinks();
    }

    // ✅ 10. OBSERVAR MUDANÇAS NO DOM
    const observer = new MutationObserver(function(mutations) {
      if (mutations.some(m => m.addedNodes.length > 0)) {
        addTrackingToLinks();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[Split2 Tracking] 🎉 Sistema ativo!');

  } catch (error) {
    console.error('[Split2 Tracking] ❌ ERRO:', error);
  }

})();
