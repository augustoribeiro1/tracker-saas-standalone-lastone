// lib/vercel.ts
// Integração com Vercel API para adicionar domínios automaticamente

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // opcional

/**
 * Adiciona um domínio customizado ao projeto Vercel automaticamente
 * @param domain - Domínio a ser adicionado (ex: track.seusite.com)
 * @returns Success ou erro
 */
export async function addDomainToVercel(domain: string) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error('VERCEL_TOKEN ou VERCEL_PROJECT_ID não configurados');
  }

  try {
    const url = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
        // gitBranch: 'main' // opcional - se quiser domínio só pra uma branch
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro ao adicionar domínio no Vercel:', data);
      
      // Domínio já existe = OK!
      if (data.error?.code === 'domain_already_in_use') {
        return { success: true, alreadyExists: true };
      }
      
      throw new Error(data.error?.message || 'Erro ao adicionar domínio');
    }

    return { success: true, domain: data };
  } catch (error: any) {
    console.error('Erro na Vercel API:', error);
    throw error;
  }
}

/**
 * Remove um domínio do projeto Vercel
 * @param domain - Domínio a ser removido
 */
export async function removeDomainFromVercel(domain: string) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error('VERCEL_TOKEN ou VERCEL_PROJECT_ID não configurados');
  }

  try {
    const url = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      }
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('Erro ao remover domínio do Vercel:', data);
      throw new Error(data.error?.message || 'Erro ao remover domínio');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao remover domínio:', error);
    throw error;
  }
}

/**
 * Verifica status de um domínio no Vercel e retorna DNS target
 * Para domínios já verificados, busca nas configurações do projeto
 * @param domain - Domínio a ser verificado
 */
export async function checkDomainStatus(domain: string) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error('VERCEL_TOKEN ou VERCEL_PROJECT_ID não configurados');
  }

  try {
    // Primeiro tenta pegar info específica do domínio
    const domainUrl = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`;

    const domainResponse = await fetch(domainUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      }
    });

    if (!domainResponse.ok) {
      const data = await domainResponse.json();
      return { exists: false, error: data.error?.message };
    }

    const domainData = await domainResponse.json();
    
    // Se tiver verification, retorna
    if (domainData.verification && Array.isArray(domainData.verification)) {
      return {
        exists: true,
        verified: domainData.verified,
        verification: domainData.verification,
        configuredBy: domainData.configuredBy,
        nameservers: domainData.nameservers,
        intendedNameservers: domainData.intendedNameservers,
      };
    }
    
    // Se não tiver verification (domínio já verificado), busca na lista de domínios do projeto
    // que tem informações mais completas
    console.log('[checkDomainStatus] verification não disponível, buscando na lista de domínios...');
    
    const listUrl = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains`;
    
    const listResponse = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
      }
    });
    
    if (listResponse.ok) {
      const listData = await listResponse.json();
      const foundDomain = listData.domains?.find((d: any) => d.name === domain);
      
      if (foundDomain) {
        console.log('[checkDomainStatus] Domínio encontrado na lista:', JSON.stringify(foundDomain, null, 2));
        
        // Mesmo na lista, domínios verificados podem não ter verification
        // Nesse caso, precisamos usar o padrão do Vercel DNS
        if (foundDomain.verification) {
          return {
            exists: true,
            verified: foundDomain.verified,
            verification: foundDomain.verification,
          };
        }
      }
    }
    
    // Último recurso: retornar o que temos, mesmo sem verification
    return {
      exists: true,
      verified: domainData.verified,
      verification: domainData.verification || null,
      configuredBy: domainData.configuredBy,
      nameservers: domainData.nameservers,
      intendedNameservers: domainData.intendedNameservers,
    };
    
  } catch (error: any) {
    console.error('Erro ao verificar domínio:', error);
    throw error;
  }
}
