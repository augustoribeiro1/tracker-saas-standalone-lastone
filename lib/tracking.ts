// /types/index.ts ou /lib/tracking.ts

const CLICKID_PREFIX = 'split2_';

/**
 * Parse tracking code format: testId-variationId-split2_clickId
 * Remove o prefixo split2_ do clickId antes de retornar
 */
export function parseTrackingCode(trackingCode: string) {
  if (!trackingCode) return null;

  // Formato esperado: testId-variationId-split2_clickId
  // Exemplo: "123-456-split2_qsDiBqVntaunBtUKI8Sm"
  const parts = trackingCode.split('-');
  
  if (parts.length >= 3) {
    // ✅ Remove prefixo split2_ do clickId
    const clickIdParts = parts.slice(2).join('-');  // Pode ter mais hífens no clickId
    const cleanClickId = clickIdParts.replace(CLICKID_PREFIX, '');
    
    return {
      testId: parseInt(parts[0]),
      variationId: parseInt(parts[1]),
      clickId: cleanClickId  // Sem prefixo
    };
  }
  
  // Se não conseguir parsear formato completo, tentar extrair só o clickId
  if (trackingCode.includes(CLICKID_PREFIX)) {
    const match = trackingCode.match(/split2_[A-Za-z0-9]{20}/);
    if (match) {
      return {
        testId: null,
        variationId: null,
        clickId: match[0].replace(CLICKID_PREFIX, '')
      };
    }
  }
  
  return null;
}

/**
 * Generate tracking code with clickId prefix
 */
export function generateTrackingCode(testId: number, variationId: number, clickId: string) {
  // ✅ Adiciona prefixo se não tiver
  const prefixedClickId = clickId.startsWith(CLICKID_PREFIX) ? clickId : CLICKID_PREFIX + clickId;
  return `${testId}-${variationId}-${prefixedClickId}`;
}

/**
 * Extract clickId from any object by searching for split2_ prefix
 */
export function extractClickId(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === 'string' && value.includes(CLICKID_PREFIX)) {
      const match = value.match(/split2_[A-Za-z0-9]{20}/);
      if (match) {
        return match[0].replace(CLICKID_PREFIX, ''); // Remove prefix
      }
    }
    
    if (value && typeof value === 'object') {
      const found = extractClickId(value);
      if (found) return found;
    }
  }

  return null;
}
