// /app/api/dashboard/route.ts
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

    // ✅ BUSCAR TODAS AS CAMPANHAS DO USUÁRIO
    const campaigns = await db.campaign.findMany({
      where: { userId },
      include: {
        variations: true,
        customDomain: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // ✅ BUSCAR TODAS AS VIEWS (CLICKS) DO USUÁRIO
    const allClicks = await db.click.findMany({
      where: {
        campaign: {
          userId
        }
      },
      select: {
        id: true,
        campaignId: true,
        createdAt: true
      }
    });

    // ✅ BUSCAR TODAS AS CONVERSÕES SECUNDÁRIAS (CHECKOUTS) DO USUÁRIO
    const allCheckouts = await db.event.findMany({
      where: {
        eventType: 'checkout',
        campaign: {
          userId
        }
      },
      select: {
        id: true,
        campaignId: true,
        createdAt: true
      }
    });

    // ✅ BUSCAR TODAS AS COMPRAS (PURCHASES) DO USUÁRIO - CORRIGIDO!
    const allPurchases = await db.event.findMany({
      where: {
        eventType: 'purchase', // ✅ ISSO ESTAVA FALTANDO!
        OR: [
          // Purchases rastreadas (com campaignId)
          {
            campaign: {
              userId
            }
          },
          // Purchases não rastreadas (sem campaignId mas com userId direto)
          {
            userId,
            campaignId: null
          }
        ]
      },
      select: {
        id: true,
        campaignId: true,
        eventValue: true,
        createdAt: true
      }
    });

    console.log('[Dashboard] User:', userId);
    console.log('[Dashboard] Campaigns:', campaigns.length);
    console.log('[Dashboard] Total Clicks:', allClicks.length);
    console.log('[Dashboard] Total Checkouts:', allCheckouts.length);
    console.log('[Dashboard] Total Purchases:', allPurchases.length);
    console.log('[Dashboard] Total Revenue:', allPurchases.reduce((sum, p) => sum + (p.eventValue || 0), 0));

    // ✅ CALCULAR MÉTRICAS GERAIS
    const totalClicks = allClicks.length;
    const totalCheckouts = allCheckouts.length;
    const totalPurchases = allPurchases.length;
    const totalRevenue = allPurchases.reduce((sum, p) => sum + (p.eventValue || 0), 0);

    // ✅ CALCULAR MÉTRICAS POR CAMPANHA
    const campaignsWithMetrics = campaigns.map(campaign => {
      const campaignClicks = allClicks.filter(c => c.campaignId === campaign.id);
      const campaignCheckouts = allCheckouts.filter(c => c.campaignId === campaign.id);
      const campaignPurchases = allPurchases.filter(p => p.campaignId === campaign.id);
      
      const revenue = campaignPurchases.reduce((sum, p) => sum + (p.eventValue || 0), 0);
      const clicks = campaignClicks.length;
      const checkouts = campaignCheckouts.length;
      const purchases = campaignPurchases.length;

      return {
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        domain: campaign.customDomain?.domain || null,
        isActive: campaign.isActive,
        variations: campaign.variations.length,
        metrics: {
          views: clicks,
          checkouts: checkouts,
          purchases: purchases, // ✅ AGORA VAI CONTAR!
          revenue: revenue, // ✅ AGORA VAI SOMAR!
          checkoutRate: clicks > 0 ? (checkouts / clicks * 100) : 0,
          purchaseRate: clicks > 0 ? (purchases / clicks * 100) : 0
        },
        createdAt: campaign.createdAt
      };
    });

    // ✅ ÚLTIMAS CONVERSÕES (PURCHASES)
    const recentPurchases = await db.event.findMany({
      where: {
        eventType: 'purchase',
        OR: [
          {
            campaign: {
              userId
            }
          },
          {
            userId,
            campaignId: null
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        eventName: true,
        eventValue: true,
        createdAt: true,
        campaign: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        variation: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      summary: {
        totalCampaigns: campaigns.length,
        totalClicks: totalClicks,
        totalCheckouts: totalCheckouts,
        totalPurchases: totalPurchases, // ✅ AGORA VAI CONTAR!
        totalRevenue: totalRevenue, // ✅ AGORA VAI SOMAR!
        checkoutRate: totalClicks > 0 ? (totalCheckouts / totalClicks * 100) : 0,
        purchaseRate: totalClicks > 0 ? (totalPurchases / totalClicks * 100) : 0,
        avgOrderValue: totalPurchases > 0 ? (totalRevenue / totalPurchases) : 0
      },
      campaigns: campaignsWithMetrics,
      recentPurchases: recentPurchases
    });

  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
