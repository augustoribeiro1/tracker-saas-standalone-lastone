/**
 * Split2 Universal Tracking Script
 * Usa clickId da API (quando disponível) e adiciona tracking aos links
 */

(function() {
  'use strict';

  const CLICKID_PREFIX = 'split2_';
  const COOKIE_NAME = 'split2_tracking';
  const COOKIE_DAYS = 30;

  /**
   * Gera clickId único de 20 caracteres (fallback se API não fornecer)
   */
  function generateClickId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result; // Retorna SEM prefixo (prefixo adicionado depois)
  }

  /**
   * Salva tracking no cookie
   */
  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + '=' + value + '; expires=' + date.toUTCString() + '; path=/';
  }

  /**
   * Lê tracking do cookie
   */
  function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  /**
   * ✅ LÓGICA PRINCIPAL DO TRACKING
   */
  try {
    // ✅ 1. CAPTURAR DADOS INJETADOS PELO WORKER
    const testId = window.__SPLIT2_TEST_ID__ || null;
    const variationId = window.__SPLIT2_VARIATION_ID__ || null;
    const apiClickId = window.__SPLIT2_CLICK_ID__ || null; // ← ClickId da API (sem prefixo)

    console.log('[Split2 Tracking] Dados injetados:', {
      testId,
      variationId,
      apiClickId
    });

    // ✅ 2. DEFINIR CLICKID (API ou gerar novo)
    let clickId;
    
    if (apiClickId) {
      // ✅ Usar clickId da API
      clickId = apiClickId;
      console.log('[Split2 Tracking] Usando clickId da API:', clickId);
    } else {
      // ✅ Fallback: gerar novo
      clickId = generateClickId();
      console.log('[Split2 Tracking] Gerado novo clickId:', clickId);
    }

    // ✅ 3. ADICIONAR PREFIXO split2_
    const clickIdWithPrefix = CLICKID_PREFIX + clickId;
    console.log('[Split2 Tracking] ClickId com prefixo:', clickIdWithPrefix);

    // ✅ 4. MONTAR TRACKING CODE
    let trackingCode;
    
    if (testId && variationId) {
      // Formato completo: testId-variationId-split2_clickId
      trackingCode = `${testId}-${variationId}-${clickIdWithPrefix}`;
    } else {
      // Formato fallback: apenas split2_clickId
      trackingCode = clickIdWithPrefix;
    }

    console.log('[Split2 Tracking] Tracking code montado:', trackingCode);

    // ✅ 5. SALVAR NO COOKIE
    setCookie(COOKIE_NAME, trackingCode, COOKIE_DAYS);

    // ✅ 6. EXPOR DADOS GLOBALMENTE
    window.__SPLIT2_TRACKING__ = {
      testId: testId,
      variationId: variationId,
      clickId: clickIdWithPrefix, // Com prefixo!
      trackingCode: trackingCode
    };

    console.log('[Split2 Tracking] Dados expostos:', window.__SPLIT2_TRACKING__);

    // ✅ 7. ADICIONAR TRACKING AOS LINKS
    function addTrackingToLinks() {
      const links = document.querySelectorAll('a[href]');
      let count = 0;

      links.forEach(link => {
        const href = link.getAttribute('href');
        
        // Ignorar links internos, âncoras, etc
        if (!href || 
            href.startsWith('#') || 
            href.startsWith('javascript:') || 
            href.startsWith('mailto:') || 
            href.startsWith('tel:')) {
          return;
        }

        // Verificar se é link externo ou relativo
        const isExternal = href.startsWith('http://') || href.startsWith('https://');
        const isRelative = href.startsWith('/') || !href.includes('://');

        if (isExternal || isRelative) {
          try {
            const url = new URL(href, window.location.origin);
            
            // ✅ ADICIONAR utm_term com tracking code
            url.searchParams.set('utm_term', trackingCode);
            
            // Preservar outros UTMs se já existirem
            link.setAttribute('href', url.toString());
            count++;
          } catch (e) {
            console.warn('[Split2 Tracking] Erro ao processar link:', href, e);
          }
        }
      });

      console.log('[Split2 Tracking] Links atualizados:', count);
      return count;
    }

    // ✅ 8. ADICIONAR TRACKING QUANDO DOM ESTIVER PRONTO
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addTrackingToLinks);
    } else {
      addTrackingToLinks();
    }

    // ✅ 9. OBSERVAR MUDANÇAS NO DOM (para SPAs)
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
          addTrackingToLinks();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[Split2 Tracking] ✅ Sistema inicializado com sucesso!');

  } catch (error) {
    console.error('[Split2 Tracking] ❌ Erro fatal:', error);
  }

})();
