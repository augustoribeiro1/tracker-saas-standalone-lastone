/**
 * lib/url-helper.ts
 * Helper para gerar URLs corretas do app
 */

/**
 * Obter URL base do app
 * Usa variável de ambiente ou fallback para Vercel
 */
export function getAppUrl(): string {
  // Produção: usa domínio customizado
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Vercel: usa variável automática
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Local development
  return 'http://localhost:3000';
}

/**
 * Gerar URL completa do webhook
 */
export function getWebhookUrl(platform: string, token: string): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/api/webhooks/${platform}/${token}`;
}

/**
 * Gerar URL de redirect/click
 */
export function getRedirectUrl(slug: string): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/r/${slug}`;
}

/**
 * Gerar URL de conversão
 */
export function getConversionUrl(slug: string): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/c/${slug}`;
}

/**
 * Verificar se é ambiente de produção
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_APP_URL;
}
