import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = request.nextUrl;
    
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');
    const skip = (page - 1) * perPage;

    // Buscar IDs das campanhas do usuário
    const userCampaignIds = await db.campaign.findMany({
      where: { userId },
      select: { id: true }
    });
    const campaignIds = userCampaignIds.map(c => c.id);

    // Buscar conversões (purchases) do usuário
    // Inclui: conversões rastreadas (com campaignId) e não rastreadas (campaignId null)
    const conversions = await db.event.findMany({
      where: {
        eventType: 'purchase',
        OR: [
          { campaignId: { in: campaignIds } },  // Conversões rastreadas deste usuário
          { 
            AND: [
              { campaignId: null },               // Conversões não rastreadas
              // Para não rastreadas, mostrar apenas as do webhook deste usuário
              // (por enquanto mostra todas - TODO: adicionar userId ao Event)
            ]
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: perPage,
      skip: skip,
      select: {
        id: true,
        clickId: true,
        eventValue: true,
        utmTerm: true,
        utmSource: true,
        utmCampaign: true,
        utmMedium: true,
        utmContent: true,
        createdAt: true,
        eventName: true,
        campaign: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    // Contar total de conversões
    const totalCount = await db.event.count({
      where: {
        eventType: 'purchase',
        OR: [
          { campaignId: { in: campaignIds } },
          { campaignId: null }
        ]
      }
    });

    return NextResponse.json({
      conversions,
      pagination: {
        page,
        perPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / perPage)
      }
    });

  } catch (error) {
    console.error('[Webhook Conversions API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversions' },
      { status: 500 }
    );
  }
}
