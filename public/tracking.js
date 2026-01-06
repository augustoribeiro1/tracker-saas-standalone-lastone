// Split2 Tracking Script v2.0 - Com Prefixo Universal
(function() {
  'use strict';

  const CLICKID_PREFIX = 'split2_';  // ✅ PREFIXO ÚNICO E INCONFUNDÍVEL

  // Função para gerar ID único
  function generateClickId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // ✅ ADICIONA PREFIXO split2_
    return CLICKID_PREFIX + result;
  }

  // Pegar parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);
  
  // Pegar testId e variationId da URL ou do window injetado
  const testId = urlParams.get('testId') || window.__SPLIT2_TEST_ID__;
  const variationId = urlParams.get('variationId') || window.__SPLIT2_VARIATION_ID__;
  
  // Verificar se já existe clickId nos cookies
  let clickId = getCookie('split2_clickid');
  
  if (!clickId) {
    // Gerar novo clickId (com prefixo split2_)
    clickId = generateClickId();
    // Salvar no cookie por 30 dias
    setCookie('split2_clickid', clickId, 30);
  }
  
  // ✅ TRACKING CODE: Agora o clickId tem o prefixo split2_
  const trackingCode = `${testId}-${variationId}-${clickId}`;
  
  // Adicionar tracking code a todos os links de checkout
  function addTrackingToLinks() {
    const checkoutLinks = document.querySelectorAll('a[href*="checkout"], a[href*="pay."], a[href*="cart"], a[href*="buy"]');
    
    checkoutLinks.forEach(link => {
      const url = new URL(link.href, window.location.origin);
      
      // Adicionar utm_term com tracking code
      url.searchParams.set('utm_term', trackingCode);
      
      // Preservar outras UTMs se existirem
      if (urlParams.get('utm_source')) url.searchParams.set('utm_source', urlParams.get('utm_source'));
      if (urlParams.get('utm_medium')) url.searchParams.set('utm_medium', urlParams.get('utm_medium'));
      if (urlParams.get('utm_campaign')) url.searchParams.set('utm_campaign', urlParams.get('utm_campaign'));
      if (urlParams.get('utm_content')) url.searchParams.set('utm_content', urlParams.get('utm_content'));
      
      link.href = url.toString();
    });
  }
  
  // Adicionar tracking ao carregar e quando DOM mudar
  addTrackingToLinks();
  const observer = new MutationObserver(addTrackingToLinks);
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Funções auxiliares para cookies
  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + "=" + value + ";expires=" + date.toUTCString() + ";path=/";
  }
  
  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }
  
  // Expor globalmente para debug
  window.__SPLIT2_TRACKING__ = {
    clickId,
    testId,
    variationId,
    trackingCode
  };
})();
