import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Buscar usuário com limites
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        maxCampaigns: true,
        maxVariations: true,
        maxClicks: true,
        maxDomains: true,
      }
    });

    // Contar recursos em uso
    const [campaignsCount, webhooksCount, domainsCount] = await Promise.all([
      db.campaign.count({ where: { userId } }),
      db.webhookConfiguration.count({ where: { userId } }),
      db.customDomain.count({ where: { userId } }),
    ]);

    // Estatísticas dos últimos 7 dias
    const stats = await db.$queryRaw<any[]>`
      SELECT 
        COUNT(DISTINCT CASE WHEN "eventType" = 'view' THEN "clickId" END) as total_views,
        COUNT(DISTINCT CASE WHEN "eventType" = 'conversion' THEN "clickId" END) as total_conversions,
        COUNT(DISTINCT CASE WHEN "eventType" = 'purchase' THEN "clickId" END) as total_purchases,
        COALESCE(SUM(CASE WHEN "eventType" = 'purchase' THEN "eventValue" ELSE 0 END), 0) as total_revenue,
        
        COALESCE(
          ROUND(
            CAST(
              COUNT(DISTINCT CASE WHEN "eventType" = 'conversion' THEN "clickId" END) * 100.0 / 
              NULLIF(COUNT(DISTINCT CASE WHEN "eventType" = 'view' THEN "clickId" END), 0)
              AS numeric
            ),
            2
          ),
          0
        ) as conversion_rate,
        
        COALESCE(
          ROUND(
            CAST(
              COUNT(DISTINCT CASE WHEN "eventType" = 'purchase' THEN "clickId" END) * 100.0 / 
              NULLIF(COUNT(DISTINCT CASE WHEN "eventType" = 'view' THEN "clickId" END), 0)
              AS numeric
            ),
            2
          ),
          0
        ) as purchase_rate,
        
        COALESCE(
          ROUND(
            CAST(
              COALESCE(SUM(CASE WHEN "eventType" = 'purchase' THEN "eventValue" ELSE 0 END), 0) / 
              NULLIF(COUNT(DISTINCT CASE WHEN "eventType" = 'purchase' THEN "clickId" END), 0)
              AS numeric
            ),
            2
          ),
          0
        ) as avg_order_value
        
      FROM "Event" e
      INNER JOIN "Campaign" c ON e."campaignId" = c.id
      WHERE c."userId" = ${userId}
        AND e."createdAt" >= ${sevenDaysAgo}
    `;

    const currentStats = stats[0] || {
      total_views: 0,
      total_conversions: 0,
      total_purchases: 0,
      total_revenue: 0,
      conversion_rate: 0,
      purchase_rate: 0,
      avg_order_value: 0,
    };

  // Timeline dos últimos 7 dias
  const timeline = await db.$queryRaw<any[]>`
    SELECT 
      DATE(e."createdAt") as date,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'view' THEN e."clickId" END) as views,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'conversion' THEN e."clickId" END) as conversions,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'purchase' THEN e."clickId" END) as purchases
    FROM "Event" e
    INNER JOIN "Campaign" c ON e."campaignId" = c.id
    WHERE c."userId" = ${userId}
      AND e."createdAt" >= ${sevenDaysAgo}
    GROUP BY DATE(e."createdAt")
    ORDER BY date ASC
  `;

  // Contar clicks do mês atual
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const clicksThisMonth = await db.event.count({
    where: {
      campaign: { userId },
      eventType: 'view',
      createdAt: { gte: currentMonth }
    }
  });

  return NextResponse.json({
    planLimits: {
      maxCampaigns: user?.maxCampaigns || 0,
      maxClicks: user?.maxClicks || 0,
      maxDomains: user?.maxDomains || 0,
    },
    usage: {
      campaigns: campaignsCount,
      clicks: clicksThisMonth,
      domains: domainsCount,
    },
    totalViews: parseInt(currentStats.total_views || '0'),
    totalConversions: parseInt(currentStats.total_conversions || '0'),
    totalPurchases: parseInt(currentStats.total_purchases || '0'),
    totalRevenue: parseFloat(currentStats.total_revenue || '0'),
    conversionRate: parseFloat(currentStats.conversion_rate || '0'),
    purchaseRate: parseFloat(currentStats.purchase_rate || '0'),
    avgOrderValue: parseFloat(currentStats.avg_order_value || '0'),
    avgConversionRate: parseFloat(currentStats.conversion_rate || '0'),
    webhooksCount,
    domainsCount,
    timeline: timeline.map(t => ({
      date: t.date.toISOString().split('T')[0],
      views: parseInt(t.views || '0'),
      conversions: parseInt(t.conversions || '0'),
      purchases: parseInt(t.purchases || '0'),
    })),
  });
  } catch (error) {
    console.error('Error in dashboard stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
