// /app/api/dashboard/stats/route.ts
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

    // ✅ FILTRO: ÚLTIMOS 7 DIAS
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log('[Dashboard Stats] User:', userId);
    console.log('[Dashboard Stats] Date filter:', sevenDaysAgo.toISOString());

    // ✅ BUSCAR TODAS AS CAMPANHAS DO USUÁRIO
    const campaigns = await db.campaign.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        customDomain: {
          select: {
            id: true,
            domain: true
          }
        },
        variations: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5 // Últimas 5 campanhas para exibir
    });

    // ✅ BUSCAR CLICKS (VIEWS) - ÚLTIMOS 7 DIAS
    const allClicks = await db.click.findMany({
      where: {
        campaign: {
          userId
        },
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        id: true,
        campaignId: true,
        createdAt: true
      }
    });

    // ✅ BUSCAR CHECKOUTS - ÚLTIMOS 7 DIAS
    const allCheckouts = await db.event.findMany({
      where: {
        eventType: 'checkout',
        campaign: {
          userId
        },
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        id: true,
        campaignId: true,
        createdAt: true
      }
    });

    // ✅ BUSCAR PURCHASES - ÚLTIMOS 7 DIAS
    const allPurchases = await db.event.findMany({
      where: {
        eventType: 'purchase',
        createdAt: {
          gte: sevenDaysAgo
        },
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

    console.log('[Dashboard Stats] Campaigns:', campaigns.length);
    console.log('[Dashboard Stats] Clicks (7d):', allClicks.length);
    console.log('[Dashboard Stats] Checkouts (7d):', allCheckouts.length);
    console.log('[Dashboard Stats] Purchases (7d):', allPurchases.length);
    console.log('[Dashboard Stats] Revenue (7d):', allPurchases.reduce((sum, p) => sum + (p.eventValue || 0), 0));

    // ✅ CALCULAR MÉTRICAS DOS ÚLTIMOS 7 DIAS
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
        variations: campaign.variations.length,
        metrics: {
          views: clicks,
          checkouts: checkouts,
          purchases: purchases,
          revenue: revenue,
          checkoutRate: clicks > 0 ? (checkouts / clicks * 100) : 0,
          purchaseRate: clicks > 0 ? (purchases / clicks * 100) : 0
        },
        createdAt: campaign.createdAt
      };
    });

    return NextResponse.json({
      summary: {
        totalCampaigns: campaigns.length,
        totalClicks: totalClicks,
        totalCheckouts: totalCheckouts,
        totalPurchases: totalPurchases,
        totalRevenue: totalRevenue,
        checkoutRate: totalClicks > 0 ? (totalCheckouts / totalClicks * 100) : 0,
        purchaseRate: totalClicks > 0 ? (totalPurchases / totalClicks * 100) : 0,
        avgOrderValue: totalPurchases > 0 ? (totalRevenue / totalPurchases) : 0
      },
      campaigns: campaignsWithMetrics
    });

  } catch (error) {
    console.error('[Dashboard Stats API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
