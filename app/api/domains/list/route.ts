import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/domains/list
 * Lista todos os domínios customizados do usuário
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

    // 2. Buscar domínios do usuário
    const domains = await db.customDomain.findMany({
      where: {
        userId: parseInt(session.user.id),
      },
      include: {
        _count: {
          select: {
            campaigns: true, // Contar campanhas por domínio
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Mais recentes primeiro
      },
    });

    // 3. Formatar resposta
    const formattedDomains = domains.map(domain => ({
      id: domain.id,
      domain: domain.domain,
      status: domain.status,
      dnsConfigured: domain.dnsConfigured,
      sslStatus: domain.sslStatus,
      campaignsCount: domain._count.campaigns,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      isActive: domain.status === 'active' && domain.dnsConfigured,
    }));

    // 4. Estatísticas
    const stats = {
      total: domains.length,
      active: domains.filter(d => d.status === 'active' && d.dnsConfigured).length,
      pending: domains.filter(d => d.status === 'pending').length,
      failed: domains.filter(d => d.status === 'failed').length,
    };

    return NextResponse.json({
      success: true,
      domains: formattedDomains,
      stats,
    });

  } catch (error: any) {
    console.error('[List Domains] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Erro ao listar domínios',
        details: error.message || 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
