import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkCustomHostnameStatus } from '@/lib/cloudflare';

/**
 * GET /api/domains/verify?domainId=123
 * Verifica o status de um domínio customizado no Cloudflare
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Pegar domainId da query string
    const searchParams = request.nextUrl.searchParams;
    const domainId = searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json(
        { error: 'domainId é obrigatório' },
        { status: 400 }
      );
    }

    // 3. Buscar domínio no banco
    const customDomain = await db.customDomain.findFirst({
      where: {
        id: parseInt(domainId),
        userId: parseInt(session.user.id), // Só pode verificar seus próprios domínios
      },
    });

    if (!customDomain) {
      return NextResponse.json(
        { error: 'Domínio não encontrado' },
        { status: 404 }
      );
    }

    if (!customDomain.cloudflareHostnameId) {
      return NextResponse.json(
        { error: 'Domínio não tem Cloudflare Hostname ID' },
        { status: 400 }
      );
    }

    console.log('[Verify Domain] Checking status:', customDomain.domain);

    // 4. Verificar status no Cloudflare
    const cfStatus = await checkCustomHostnameStatus(
      customDomain.cloudflareHostnameId
    );

    if (!cfStatus.success) {
      return NextResponse.json(
        { error: 'Erro ao verificar status no Cloudflare' },
        { status: 500 }
      );
    }

    // 5. Atualizar status no banco de dados
    const isActive = cfStatus.status === 'active' && cfStatus.sslStatus === 'active';
    
    const updatedDomain = await db.customDomain.update({
      where: {
        id: customDomain.id,
      },
      data: {
        status: isActive ? 'active' : 'pending',
        sslStatus: cfStatus.sslStatus,
        dnsConfigured: isActive,
      },
    });

    console.log('[Verify Domain] Status updated:', {
      domain: updatedDomain.domain,
      status: updatedDomain.status,
      isActive,
    });

    // 6. Retornar status atualizado
    return NextResponse.json({
      success: true,
      domain: {
        id: updatedDomain.id,
        domain: updatedDomain.domain,
        status: updatedDomain.status,
        dnsConfigured: updatedDomain.dnsConfigured,
        sslStatus: updatedDomain.sslStatus,
        isActive,
      },
      cloudflare: {
        status: cfStatus.status,
        sslStatus: cfStatus.sslStatus,
        verificationErrors: cfStatus.verificationErrors,
      },
      message: isActive
        ? 'Domínio configurado e ativo! ✅'
        : 'Aguardando configuração DNS. Pode levar alguns minutos após configurar o CNAME.',
    });

  } catch (error: any) {
    console.error('[Verify Domain] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Erro ao verificar domínio',
        details: error.message || 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/domains/verify
 * Verificar múltiplos domínios de uma vez (batch)
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

    // 2. Buscar todos domínios pendentes do usuário
    const pendingDomains = await db.customDomain.findMany({
      where: {
        userId: parseInt(session.user.id),
        status: 'pending',
        cloudflareHostnameId: {
          not: null,
        },
      },
    });

    if (pendingDomains.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum domínio pendente para verificar',
        updated: 0,
      });
    }

    console.log('[Verify Domains Batch] Checking', pendingDomains.length, 'domains');

    // 3. Verificar cada domínio
    const results = [];
    
    for (const domain of pendingDomains) {
      try {
        const cfStatus = await checkCustomHostnameStatus(
          domain.cloudflareHostnameId!
        );

        const isActive = cfStatus.status === 'active' && cfStatus.sslStatus === 'active';

        // Atualizar no banco
        await db.customDomain.update({
          where: { id: domain.id },
          data: {
            status: isActive ? 'active' : 'pending',
            sslStatus: cfStatus.sslStatus,
            dnsConfigured: isActive,
          },
        });

        results.push({
          domain: domain.domain,
          status: isActive ? 'active' : 'pending',
          isActive,
        });

      } catch (error: any) {
        console.error('[Verify Domains Batch] Error checking', domain.domain, error);
        results.push({
          domain: domain.domain,
          status: 'error',
          error: error.message,
        });
      }
    }

    const activated = results.filter(r => r.status === 'active').length;

    return NextResponse.json({
      success: true,
      checked: pendingDomains.length,
      activated,
      results,
    });

  } catch (error: any) {
    console.error('[Verify Domains Batch] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Erro ao verificar domínios',
        details: error.message || 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
