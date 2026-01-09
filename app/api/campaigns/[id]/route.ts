import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPlanLimits, planNameToId } from '@/lib/plan-limits';

// GET /api/campaigns/[id] - Buscar campanha
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const campaignId = parseInt(params.id);

  try {
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        userId: parseInt(session.user.id)
      },
      include: {
        variations: {
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('[Campaign API] Error fetching campaign:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/campaigns/[id] - Atualizar campanha
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const campaignId = parseInt(params.id);
  const body = await request.json();
  const { name, slug, variations, enableSecondaryConversion, checkoutUrl } = body;

  try {
    // Verificar se campanha existe e pertence ao usuário
    const existing = await db.campaign.findFirst({
      where: {
        id: campaignId,
        userId: parseInt(session.user.id)
      },
      include: {
        user: true
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // ✅ VERIFICAR LIMITE DE VARIAÇÕES BASEADO NO PLANO
    const userPlan = existing.user.plan || 'free';
    const planId = planNameToId(userPlan);
    const planLimits = getPlanLimits(planId);

    if (variations.length > planLimits.variations) {
      return NextResponse.json({
        error: `Seu plano ${planLimits.name} permite apenas ${planLimits.variations} variações. Faça upgrade para o plano PRO para usar 3 variações.`,
        limit: planLimits.variations,
        current: variations.length
      }, { status: 403 });
    }

    // Validar soma de weights
    const totalWeight = variations.reduce((sum: number, v: any) => sum + (v.weight || 0), 0);
    if (totalWeight !== 100) {
      return NextResponse.json({
        error: `A soma das porcentagens deve ser 100%. Atual: ${totalWeight}%`
      }, { status: 400 });
    }

    // Validar checkout URL se conversão secundária estiver ativada
    if (enableSecondaryConversion && !checkoutUrl) {
      return NextResponse.json({
        error: 'URL do Checkout é obrigatória quando Conversão Secundária está ativada'
      }, { status: 400 });
    }

    // Atualizar campanha
    const updated = await db.campaign.update({
      where: { id: campaignId },
      data: {
        name,
        slug,
        enableSecondaryConversion: enableSecondaryConversion || false,
        checkoutUrl: enableSecondaryConversion ? checkoutUrl : null,
        updatedAt: new Date()
      }
    });

    // ✅ BUSCAR VARIAÇÕES EXISTENTES
    const existingVariations = await db.variation.findMany({
      where: { campaignId },
      select: { id: true }
    });

    // ✅ IDs das variações enviadas pelo frontend
    const sentVariationIds = variations
      .filter((v: any) => v.id)
      .map((v: any) => v.id);

    // ✅ IDENTIFICAR VARIAÇÕES QUE FORAM REMOVIDAS
    const variationsToDelete = existingVariations
      .filter(v => !sentVariationIds.includes(v.id))
      .map(v => v.id);

    // ✅ DELETAR VARIAÇÕES REMOVIDAS
    if (variationsToDelete.length > 0) {
      await db.variation.deleteMany({
        where: {
          id: { in: variationsToDelete },
          campaignId // Segurança extra
        }
      });
      console.log(`[Campaign API] Deleted ${variationsToDelete.length} variation(s):`, variationsToDelete);
    }

    // ✅ ATUALIZAR/CRIAR VARIAÇÕES
    for (const variation of variations) {
      if (variation.id) {
        // Atualizar variação existente
        await db.variation.update({
          where: { id: variation.id },
          data: {
            name: variation.name,
            destinationUrl: variation.destinationUrl,
            weight: variation.weight
          }
        });
      } else {
        // Criar nova variação (se necessário)
        await db.variation.create({
          data: {
            name: variation.name,
            destinationUrl: variation.destinationUrl,
            weight: variation.weight,
            campaignId: campaignId
          }
        });
      }
    }

    return NextResponse.json({ 
      campaign: updated,
      message: 'Campanha atualizada com sucesso!' 
    });
  } catch (error: any) {
    console.error('[Campaign API] Error updating campaign:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id] - Deletar campanha
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const campaignId = parseInt(params.id);

  try {
    // Verificar se campanha existe e pertence ao usuário
    const existing = await db.campaign.findFirst({
      where: {
        id: campaignId,
        userId: parseInt(session.user.id)
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Deletar variações primeiro (cascade)
    await db.variation.deleteMany({
      where: { campaignId }
    });

    // Deletar campanha
    await db.campaign.delete({
      where: { id: campaignId }
    });

    return NextResponse.json({ 
      message: 'Campanha deletada com sucesso!' 
    });
  } catch (error: any) {
    console.error('[Campaign API] Error deleting campaign:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
