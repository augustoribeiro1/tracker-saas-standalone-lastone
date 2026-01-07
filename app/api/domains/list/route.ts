// /app/api/domains/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPlanLimits } from '@/lib/plan-limits';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const userPlanId = session.user.planId || 1;

    // ✅ BUSCAR DOMÍNIO PADRÃO DO SISTEMA
    const systemDomain = await db.customDomain.findFirst({
      where: {
        domain: 'app.split2.com.br',
        isSystemDefault: true
      }
    });

    // ✅ BUSCAR DOMÍNIOS PERSONALIZADOS DO USUÁRIO
    const userDomains = await db.customDomain.findMany({
      where: {
        userId: userId,
        isSystemDefault: false // Excluir domínio do sistema
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // ✅ MONTAR LISTA COM DOMÍNIO PADRÃO + DOMÍNIOS DO USUÁRIO
    const allDomains = [];

    // Adicionar domínio padrão sempre no início
    if (systemDomain) {
      allDomains.push({
        ...systemDomain,
        isDefault: true,
        canDelete: false
      });
    }

    // Adicionar domínios personalizados do usuário
    userDomains.forEach(domain => {
      allDomains.push({
        ...domain,
        isDefault: false,
        canDelete: true
      });
    });

    // ✅ INFORMAÇÕES DE LIMITE DO PLANO
    const planLimits = getPlanLimits(userPlanId);
    const customDomainsCount = userDomains.length;
    const canAddMore = customDomainsCount < planLimits.customDomains;

    return NextResponse.json({
      domains: allDomains,
      limits: {
        current: customDomainsCount,
        max: planLimits.customDomains,
        canAddMore,
        plan: planLimits.name
      }
    });

  } catch (error: any) {
    console.error('[Domains List API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}
