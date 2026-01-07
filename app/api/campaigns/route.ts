import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPlanLimits, planNameToId, canAddCampaign } from '@/lib/plan-limits';
import { generateSlugWithUserId } from '@/lib/generate-slug';

// GET /api/campaigns - Listar campanhas do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    console.log('[GET /api/campaigns] User ID:', user.id);

    const campaigns = await db.campaign.findMany({
      where: { userId: user.id },
      include: {
        variations: {
          orderBy: { id: 'asc' }
        },
        customDomain: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('[GET /api/campaigns] Found campaigns:', campaigns.length);

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error('Erro ao listar campanhas:', error);
    return NextResponse.json(
      { error: 'Erro ao listar campanhas', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Criar nova campanha
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // ✅ VERIFICAR LIMITE DE CAMPANHAS DO PLANO
    const userPlan = user.plan || 'free';
    const planId = planNameToId(userPlan);
    const planLimits = getPlanLimits(planId);
    
    const currentCampaignsCount = await db.campaign.count({
      where: { userId: user.id }
    });

    if (!canAddCampaign(planId, currentCampaignsCount)) {
      return NextResponse.json({
        error: `Limite de campanhas atingido. Seu plano ${planLimits.name} permite ${planLimits.campaigns} campanha(s).`,
        limit: planLimits.campaigns,
        current: currentCampaignsCount
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, variations, customDomainId, enableSecondaryConversion, checkoutUrl } = body;

    // Validações básicas
    if (!name || !variations || variations.length < 2) {
      return NextResponse.json(
        { error: 'Nome e pelo menos 2 variações são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar checkout URL se conversão secundária estiver ativada
    if (enableSecondaryConversion && !checkoutUrl) {
      return NextResponse.json({
        error: 'URL do Checkout é obrigatória quando Conversão Secundária está ativada'
      }, { status: 400 });
    }

    // Validar domínio se fornecido
    let selectedDomain = null;
    if (customDomainId) {
      // ✅ Buscar domínio pelo ID (sem filtrar por userId ainda)
      selectedDomain = await db.customDomain.findFirst({
        where: {
          id: parseInt(customDomainId)
        }
      });

      if (!selectedDomain) {
        return NextResponse.json(
          { error: 'Domínio não encontrado' },
          { status: 400 }
        );
      }

      // ✅ Verificar se é domínio padrão do sistema
      const isSystemDomain = selectedDomain.domain === 'app.split2.com.br';

      // ✅ Domínio padrão: permitido para todos
      // ✅ Domínio personalizado: verificar ownership
      if (!isSystemDomain && selectedDomain.userId !== user.id) {
        return NextResponse.json(
          { error: 'Domínio selecionado não pertence a você' },
          { status: 400 }
        );
      }

      console.log('[Create Campaign] Domínio validado:', {
        domain: selectedDomain.domain,
        isSystem: isSystemDomain,
        userId: user.id
      });
    }

    // ✅ VERIFICAR SE É DOMÍNIO PADRÃO DO SISTEMA
    const isDefaultDomain = customDomainId ? 
      selectedDomain?.domain === 'app.split2.com.br' : 
      false;

    // ✅ VALIDAR SLUG: Obrigatório apenas para domínios personalizados
    if (!isDefaultDomain && (!slug || slug.trim() === '')) {
      return NextResponse.json(
        { error: 'Slug é obrigatório para domínios personalizados' },
        { status: 400 }
      );
    }

    // ✅ GERAR SLUG FINAL
    let finalSlug: string;
    
    if (isDefaultDomain) {
      // Gerar slug com prefixo de userId: 17-abc123de
      finalSlug = generateSlugWithUserId(user.id);
      console.log('[Create Campaign] Domínio padrão detectado, slug gerado:', finalSlug);
    } else {
      // Usar slug fornecido pelo usuário
      finalSlug = slug.toLowerCase().trim();
      console.log('[Create Campaign] Domínio personalizado, slug fornecido:', finalSlug);
    }

    // Verificar se slug já existe
    const existing = await db.campaign.findFirst({
      where: { 
        slug: finalSlug, 
        customDomainId: customDomainId ? parseInt(customDomainId) : null
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma campanha com este slug' },
        { status: 400 }
      );
    }

    // Criar campanha
    const campaign = await db.campaign.create({
      data: {
        name,
        slug: finalSlug, // ✅ Usar slug gerado (com userId se domínio padrão)
        userId: user.id,
        status: 'active',
        customDomainId: customDomainId ? parseInt(customDomainId) : null,
        enableSecondaryConversion: enableSecondaryConversion || false,
        checkoutUrl: enableSecondaryConversion ? checkoutUrl : null,
        variations: {
          create: variations.map((v: any) => ({
            name: v.name,
            destinationUrl: v.destinationUrl,
            weight: v.weight || 50
          }))
        }
      },
      include: {
        variations: true,
        customDomain: true
      }
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar campanha:', error);
    return NextResponse.json(
      { error: 'Erro ao criar campanha', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns?id=X - Deletar campanha
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');

    if (!campaignId) {
      return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se campanha pertence ao usuário
    const campaign = await db.campaign.findFirst({
      where: {
        id: parseInt(campaignId),
        userId: user.id
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    // Deletar campanha (cascade deleta variações)
    await db.campaign.delete({
      where: { id: parseInt(campaignId) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar campanha:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar campanha', details: error.message },
      { status: 500 }
    );
  }
}
