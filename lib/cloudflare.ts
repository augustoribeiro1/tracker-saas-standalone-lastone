/**
 * Cloudflare for SaaS - Custom Hostnames API
 * Gerencia domínios customizados via Cloudflare
 */

interface CloudflareConfig {
  apiToken: string;
  zoneId: string;
  accountId: string;
}

interface CustomHostnameResponse {
  id: string;
  hostname: string;
  status: 'pending' | 'active' | 'moved' | 'deleted';
  ssl: {
    status: string;
    method: string;
    type: string;
  };
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };
  ownership_verification_http?: {
    http_url: string;
    http_body: string;
  };
  verification_errors?: string[];
  created_at: string;
}

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

/**
 * Obter configuração do Cloudflare das variáveis de ambiente
 */
function getCloudflareConfig(): CloudflareConfig {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !zoneId || !accountId) {
    throw new Error('Missing Cloudflare credentials. Check environment variables.');
  }

  return { apiToken, zoneId, accountId };
}

/**
 * Fazer requisição para API do Cloudflare
 */
async function cloudflareRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH' = 'GET',
  body?: any
): Promise<CloudflareApiResponse<T>> {
  const config = getCloudflareConfig();
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4${endpoint}`,
    {
      method,
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Cloudflare API] Error:', response.status, errorText);
    throw new Error(`Cloudflare API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Adicionar Custom Hostname no Cloudflare for SaaS
 */
export async function addCustomHostname(hostname: string) {
  const config = getCloudflareConfig();
  
  console.log('[Cloudflare] Adding custom hostname:', hostname);
  
  try {
    const response = await cloudflareRequest<CustomHostnameResponse>(
      `/zones/${config.zoneId}/custom_hostnames`,
      'POST',
      {
        hostname,
        ssl: {
          method: 'http', // Validação via HTTP (mais fácil)
          type: 'dv', // Domain Validation
          settings: {
            min_tls_version: '1.2',
            http2: 'on',
            tls_1_3: 'on',
          }
        }
      }
    );

    if (!response.success) {
      console.error('[Cloudflare] Error adding hostname:', response.errors);
      throw new Error(response.errors[0]?.message || 'Failed to add custom hostname');
    }

    console.log('[Cloudflare] Hostname added successfully:', response.result.id);

    return {
      success: true,
      hostnameId: response.result.id,
      hostname: response.result.hostname,
      status: response.result.status,
      sslStatus: response.result.ssl.status,
      verificationToken: response.result.ownership_verification?.value,
      verificationName: response.result.ownership_verification?.name,
      httpUrl: response.result.ownership_verification_http?.http_url,
      httpBody: response.result.ownership_verification_http?.http_body,
    };
  } catch (error: any) {
    console.error('[Cloudflare] Exception adding hostname:', error);
    throw error;
  }
}

/**
 * Verificar status de um Custom Hostname
 */
export async function checkCustomHostnameStatus(hostnameId: string) {
  const config = getCloudflareConfig();
  
  console.log('[Cloudflare] Checking hostname status:', hostnameId);
  
  try {
    const response = await cloudflareRequest<CustomHostnameResponse>(
      `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`,
      'GET'
    );

    if (!response.success) {
      console.error('[Cloudflare] Error checking status:', response.errors);
      throw new Error(response.errors[0]?.message || 'Failed to check hostname status');
    }

    const result = response.result;

    return {
      success: true,
      hostname: result.hostname,
      status: result.status,
      sslStatus: result.ssl.status,
      verificationErrors: result.verification_errors || [],
      isActive: result.status === 'active' && result.ssl.status === 'active',
    };
  } catch (error: any) {
    console.error('[Cloudflare] Exception checking status:', error);
    throw error;
  }
}

/**
 * Listar todos Custom Hostnames
 */
export async function listCustomHostnames(page = 1, perPage = 50) {
  const config = getCloudflareConfig();
  
  console.log('[Cloudflare] Listing custom hostnames, page:', page);
  
  try {
    const response = await cloudflareRequest<CustomHostnameResponse[]>(
      `/zones/${config.zoneId}/custom_hostnames?page=${page}&per_page=${perPage}`,
      'GET'
    );

    if (!response.success) {
      console.error('[Cloudflare] Error listing hostnames:', response.errors);
      throw new Error(response.errors[0]?.message || 'Failed to list hostnames');
    }

    return {
      success: true,
      hostnames: response.result.map(h => ({
        id: h.id,
        hostname: h.hostname,
        status: h.status,
        sslStatus: h.ssl.status,
        createdAt: h.created_at,
      })),
    };
  } catch (error: any) {
    console.error('[Cloudflare] Exception listing hostnames:', error);
    throw error;
  }
}

/**
 * Deletar Custom Hostname
 */
export async function deleteCustomHostname(hostnameId: string) {
  const config = getCloudflareConfig();
  
  console.log('[Cloudflare] Deleting custom hostname:', hostnameId);
  
  try {
    const response = await cloudflareRequest<{ id: string }>(
      `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`,
      'DELETE'
    );

    if (!response.success) {
      console.error('[Cloudflare] Error deleting hostname:', response.errors);
      throw new Error(response.errors[0]?.message || 'Failed to delete hostname');
    }

    console.log('[Cloudflare] Hostname deleted successfully');

    return {
      success: true,
      hostnameId: response.result.id,
    };
  } catch (error: any) {
    console.error('[Cloudflare] Exception deleting hostname:', error);
    throw error;
  }
}

/**
 * Atualizar Custom Hostname (editar SSL settings, etc)
 */
export async function updateCustomHostname(
  hostnameId: string,
  updates: {
    ssl?: {
      method?: 'http' | 'txt' | 'email';
      type?: 'dv';
    };
  }
) {
  const config = getCloudflareConfig();
  
  console.log('[Cloudflare] Updating custom hostname:', hostnameId);
  
  try {
    const response = await cloudflareRequest<CustomHostnameResponse>(
      `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`,
      'PATCH',
      updates
    );

    if (!response.success) {
      console.error('[Cloudflare] Error updating hostname:', response.errors);
      throw new Error(response.errors[0]?.message || 'Failed to update hostname');
    }

    return {
      success: true,
      hostname: response.result.hostname,
      status: response.result.status,
    };
  } catch (error: any) {
    console.error('[Cloudflare] Exception updating hostname:', error);
    throw error;
  }
}

/**
 * Validar formato de domínio
 */
export function validateDomain(domain: string): { valid: boolean; error?: string } {
  // Remover protocolo se presente
  domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // Regex básico para validar domínio
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  
  if (!domainRegex.test(domain)) {
    return {
      valid: false,
      error: 'Formato de domínio inválido. Use apenas letras, números, hífens e pontos.',
    };
  }
  
  // Verificar se não é localhost ou IP
  if (domain.includes('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    return {
      valid: false,
      error: 'Localhost e endereços IP não são permitidos.',
    };
  }
  
  // Verificar tamanho
  if (domain.length > 253) {
    return {
      valid: false,
      error: 'Domínio muito longo (máximo 253 caracteres).',
    };
  }
  
  return { valid: true };
}
