import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
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
      COUNT(DISTINCT CASE WHEN event_type = 'view' THEN click_id END) as total_views,
      COUNT(DISTINCT CASE WHEN event_type = 'conversion' THEN click_id END) as total_conversions,
      COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN click_id END) as total_purchases,
      COALESCE(SUM(CASE WHEN event_type = 'purchase' THEN event_value ELSE 0 END), 0) as total_revenue,
      
      ROUND(
        COUNT(DISTINCT CASE WHEN event_type = 'conversion' THEN click_id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'view' THEN click_id END), 0), 
        2
      ) as conversion_rate,
      
      ROUND(
        COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN click_id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'view' THEN click_id END), 0), 
        2
      ) as purchase_rate,
      
      ROUND(
        COALESCE(SUM(CASE WHEN event_type = 'purchase' THEN event_value ELSE 0 END), 0) / 
        NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN click_id END), 0),
        2
      ) as avg_order_value
      
    FROM events e
    INNER JOIN campaigns c ON e.campaign_id = c.id
    WHERE c.user_id = ${userId}
      AND e.created_at >= ${sevenDaysAgo}
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
      DATE(e.created_at) as date,
      COUNT(DISTINCT CASE WHEN e.event_type = 'view' THEN e.click_id END) as views,
      COUNT(DISTINCT CASE WHEN e.event_type = 'conversion' THEN e.click_id END) as conversions,
      COUNT(DISTINCT CASE WHEN e.event_type = 'purchase' THEN e.click_id END) as purchases
    FROM events e
    INNER JOIN campaigns c ON e.campaign_id = c.id
    WHERE c.user_id = ${userId}
      AND e.created_at >= ${sevenDaysAgo}
    GROUP BY DATE(e.created_at)
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
    totalViews: parseInt(currentStats.total_views),
    totalConversions: parseInt(currentStats.total_conversions),
    totalPurchases: parseInt(currentStats.total_purchases),
    totalRevenue: parseFloat(currentStats.total_revenue),
    conversionRate: parseFloat(currentStats.conversion_rate),
    purchaseRate: parseFloat(currentStats.purchase_rate),
    avgOrderValue: parseFloat(currentStats.avg_order_value),
    avgConversionRate: parseFloat(currentStats.conversion_rate),
    webhooksCount,
    domainsCount,
    timeline: timeline.map(t => ({
      date: t.date.toISOString().split('T')[0],
      views: parseInt(t.views),
      conversions: parseInt(t.conversions),
      purchases: parseInt(t.purchases),
    })),
  });
}
