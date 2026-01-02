import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { addCustomHostname, validateDomain } from '@/lib/cloudflare';

/**
 * POST /api/domains/add
 * Adiciona um novo domínio customizado para o usuário
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Pegar dados do body
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domínio é obrigatório' },
        { status: 400 }
      );
    }

    // 3. Limpar e normalizar domínio
    let cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '') // Remove protocolo
      .replace(/\/$/, ''); // Remove trailing slash

    // 4. Validar formato
    const validation = validateDomain(cleanDomain);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 5. Verificar se domínio já existe (qualquer usuário)
    const existingDomain = await db.customDomain.findFirst({
      where: {
        domain: cleanDomain,
      },
    });

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Este domínio já está em uso' },
        { status: 409 }
      );
    }

    // 6. Verificar limite de domínios do usuário
    const userDomainsCount = await db.customDomain.count({
      where: {
        userId: parseInt(session.user.id),
      },
    });

    // TODO: Verificar plano do usuário e limites
    const MAX_DOMAINS = 10; // Ajustar conforme plano

    if (userDomainsCount >= MAX_DOMAINS) {
      return NextResponse.json(
        {
          error: `Limite de ${MAX_DOMAINS} domínios atingido. Faça upgrade do seu plano.`,
        },
        { status: 403 }
      );
    }

    console.log('[Add Domain] Adding domain for user:', session.user.id, cleanDomain);

    // 7. Adicionar no Cloudflare for SaaS
    const cfResult = await addCustomHostname(cleanDomain);

    if (!cfResult.success) {
      return NextResponse.json(
        { error: 'Erro ao configurar domínio no Cloudflare' },
        { status: 500 }
      );
    }

    // 8. Salvar no banco de dados
    const customDomain = await db.customDomain.create({
      data: {
        userId: parseInt(session.user.id),
        domain: cleanDomain,
        status: 'pending',
        dnsConfigured: false,
        cloudflareHostnameId: cfResult.hostnameId,
        sslStatus: cfResult.sslStatus,
        verificationToken: cfResult.verificationToken,
        verificationName: cfResult.verificationName,
      },
    });

    console.log('[Add Domain] Domain added successfully:', customDomain.id);

    // 9. Retornar sucesso com instruções DNS
    return NextResponse.json({
      success: true,
      domain: {
        id: customDomain.id,
        domain: customDomain.domain,
        status: customDomain.status,
        sslStatus: customDomain.sslStatus,
      },
      dnsInstructions: {
        message: 'Configure o DNS do seu domínio com as informações abaixo:',
        type: 'CNAME',
        name: cleanDomain.split('.')[0], // Subdomain (ex: "track" de "track.cliente.com")
        value: cfResult.httpUrl || `${cleanDomain}.cdn.cloudflare.net`,
        ttl: 'Auto ou 300',
        proxy: 'Desativado (DNS only)',
        note: 'Após configurar o DNS, clique em "Verificar DNS" para ativar o domínio.',
      },
    });

  } catch (error: any) {
    console.error('[Add Domain] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Erro ao adicionar domínio',
        details: error.message || 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
