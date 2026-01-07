// /app/api/campaigns/[id]/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaignId = parseInt(params.id);
    const userId = parseInt(session.user.id);
    const { searchParams } = request.nextUrl;
    
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // ✅ VERIFICAR SE CAMPANHA PERTENCE AO USUÁRIO
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        userId: userId
      },
      include: {
        variations: true
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // ✅ CONSTRUIR WHERE CLAUSE PARA FILTRO DE DATA
    const dateFilter: any = {
      campaignId: campaignId
    };

    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    // ✅ BUSCAR CLICKS (VIEWS)
    const clicks = await db.click.findMany({
      where: dateFilter,
      select: {
        id: true,
        variationId: true,
        createdAt: true
      }
    });

    // ✅ BUSCAR CHECKOUTS (CONVERSÃO SECUNDÁRIA)
    const checkouts = await db.event.findMany({
      where: {
        ...dateFilter,
        eventType: 'checkout'
      },
      select: {
        id: true,
        variationId: true,
        createdAt: true
      }
    });

    // ✅ BUSCAR PURCHASES (CONVERSÃO PRIMÁRIA) - CORRIGIDO!
    const purchases = await db.event.findMany({
      where: {
        ...dateFilter,
        eventType: 'purchase' // ✅ ISSO ESTAVA FALTANDO OU ERRADO!
      },
      select: {
        id: true,
        variationId: true,
        eventValue: true,
        createdAt: true
      }
    });

    console.log('[Analytics] Campaign:', campaignId);
    console.log('[Analytics] Clicks:', clicks.length);
    console.log('[Analytics] Checkouts:', checkouts.length);
    console.log('[Analytics] Purchases:', purchases.length);
    console.log('[Analytics] Total Revenue:', purchases.reduce((sum, p) => sum + (p.eventValue || 0), 0));

    // ✅ AGRUPAR POR VARIAÇÃO
    const variationMetrics = campaign.variations.map(variation => {
      const varClicks = clicks.filter(c => c.variationId === variation.id);
      const varCheckouts = checkouts.filter(c => c.variationId === variation.id);
      const varPurchases = purchases.filter(p => p.variationId === variation.id);
      
      const revenue = varPurchases.reduce((sum, p) => sum + (p.eventValue || 0), 0);
      const views = varClicks.length;
      const checkoutCount = varCheckouts.length;
      const purchaseCount = varPurchases.length;

      return {
        variation_id: variation.id,
        variation_name: variation.name,
        views: views,
        checkouts: checkoutCount,
        purchases: purchaseCount, // ✅ AGORA VAI CONTAR!
        revenue: revenue, // ✅ AGORA VAI SOMAR!
        checkout_rate: views > 0 ? (checkoutCount / views * 100) : 0,
        purchase_rate: views > 0 ? (purchaseCount / views * 100) : 0
      };
    });

    // ✅ TIMELINE (DADOS POR DIA)
    const timeline: any = {};
    
    // Processar clicks (views)
    clicks.forEach(click => {
      const date = click.createdAt.toISOString().split('T')[0];
      if (!timeline[date]) {
        timeline[date] = { date, views: 0, conversions: 0, purchases: 0 };
      }
      timeline[date].views++;
    });

    // Processar checkouts
    checkouts.forEach(checkout => {
      const date = checkout.createdAt.toISOString().split('T')[0];
      if (!timeline[date]) {
        timeline[date] = { date, views: 0, conversions: 0, purchases: 0 };
      }
      timeline[date].conversions++;
    });

    // Processar purchases
    purchases.forEach(purchase => {
      const date = purchase.createdAt.toISOString().split('T')[0];
      if (!timeline[date]) {
        timeline[date] = { date, views: 0, conversions: 0, purchases: 0 };
      }
      timeline[date].purchases++; // ✅ AGORA VAI CONTAR!
    });

    const timelineArray = Object.values(timeline).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug
      },
      metrics: variationMetrics,
      timeline: timelineArray,
      summary: {
        total_clicks: clicks.length,
        total_checkouts: checkouts.length,
        total_purchases: purchases.length,
        total_revenue: purchases.reduce((sum, p) => sum + (p.eventValue || 0), 0)
      }
    });

  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
