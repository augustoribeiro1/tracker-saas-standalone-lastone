import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const campaignId = parseInt(params.id);
  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = searchParams.get('end_date') || new Date().toISOString();

  // Verificar se campanha pertence ao usuário
  const campaign = await db.campaign.findFirst({
    where: {
      id: campaignId,
      userId: parseInt(session.user.id)
    },
    include: {
      variations: true
    }
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Buscar métricas por variação
  const metrics = await db.$queryRaw`
    SELECT 
      v.id as variation_id,
      v.name as variation_name,
      
      COUNT(DISTINCT CASE WHEN e.event_type = 'view' THEN e.click_id END) as views,
      COUNT(DISTINCT CASE WHEN e.event_type = 'conversion' AND e.event_name = 'checkout_click' THEN e.click_id END) as checkouts,
      COUNT(DISTINCT CASE WHEN e.event_type = 'purchase' THEN e.click_id END) as purchases,
      
      COALESCE(SUM(CASE WHEN e.event_type = 'purchase' THEN e.event_value ELSE 0 END), 0) as revenue,
      
      ROUND(
        COUNT(DISTINCT CASE WHEN e.event_type = 'conversion' AND e.event_name = 'checkout_click' THEN e.click_id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT CASE WHEN e.event_type = 'view' THEN e.click_id END), 0), 
        2
      ) as checkout_rate,
      
      ROUND(
        COUNT(DISTINCT CASE WHEN e.event_type = 'purchase' THEN e.click_id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT CASE WHEN e.event_type = 'view' THEN e.click_id END), 0), 
        2
      ) as purchase_rate,
      
      ROUND(
        COALESCE(SUM(CASE WHEN e.event_type = 'purchase' THEN e.event_value ELSE 0 END), 0) / 
        NULLIF(COUNT(DISTINCT CASE WHEN e.event_type = 'purchase' THEN e.click_id END), 0),
        2
      ) as avg_order_value
      
    FROM variations v
    LEFT JOIN events e ON v.id = e.variation_id 
      AND e.created_at >= ${startDate}::timestamp 
      AND e.created_at <= ${endDate}::timestamp
    WHERE v.campaign_id = ${campaignId}
    GROUP BY v.id, v.name
    ORDER BY revenue DESC
  `;

  // Buscar dados do funil
  const funnelData = await db.$queryRaw`
    WITH funnel_steps AS (
      SELECT 
        variation_id,
        COUNT(DISTINCT CASE WHEN event_type = 'view' THEN click_id END) as step_views,
        COUNT(DISTINCT CASE WHEN event_type = 'engagement' AND event_name = 'video_play' THEN click_id END) as step_video_play,
        COUNT(DISTINCT CASE WHEN event_type = 'engagement' AND event_name = 'video_50' THEN click_id END) as step_video_50,
        COUNT(DISTINCT CASE WHEN event_type = 'engagement' AND event_name = 'video_complete' THEN click_id END) as step_video_complete,
        COUNT(DISTINCT CASE WHEN event_type = 'conversion' AND event_name = 'checkout_click' THEN click_id END) as step_checkout,
        COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN click_id END) as step_purchase
      FROM events
      WHERE campaign_id = ${campaignId}
        AND created_at >= ${startDate}::timestamp 
        AND created_at <= ${endDate}::timestamp
      GROUP BY variation_id
    )
    SELECT * FROM funnel_steps
  `;

  // Buscar timeline (últimos 30 dias)
  const timeline = await db.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      variation_id,
      COUNT(DISTINCT CASE WHEN event_type = 'view' THEN click_id END) as views,
      COUNT(DISTINCT CASE WHEN event_type = 'conversion' THEN click_id END) as conversions,
      COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN click_id END) as purchases,
      COALESCE(SUM(CASE WHEN event_type = 'purchase' THEN event_value ELSE 0 END), 0) as revenue
    FROM events
    WHERE campaign_id = ${campaignId}
      AND created_at >= ${startDate}::timestamp 
      AND created_at <= ${endDate}::timestamp
    GROUP BY DATE(created_at), variation_id
    ORDER BY date ASC
  `;

  return NextResponse.json({
    campaign,
    metrics,
    funnelData,
    timeline,
    dateRange: {
      start: startDate,
      end: endDate
    }
  });
}
