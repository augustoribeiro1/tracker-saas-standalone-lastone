import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Helper para converter BigInt em Number (PostgreSQL retorna BigInt em COUNT/SUM)
function convertBigIntToNumber(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      converted[key] = convertBigIntToNumber(obj[key]);
    }
    return converted;
  }
  
  return obj;
}

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
  
  // Datas padrão: últimos 30 dias
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  defaultStartDate.setHours(0, 0, 0, 0);
  
  const defaultEndDate = new Date();
  defaultEndDate.setHours(23, 59, 59, 999);
  
  const startDate = searchParams.get('start_date') || defaultStartDate.toISOString();
  const endDate = searchParams.get('end_date') || defaultEndDate.toISOString();
  
  console.log('[Analytics] Fetching data for campaign', campaignId, 'from', startDate, 'to', endDate);

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
  const metricsRaw = await db.$queryRaw`
    SELECT 
      v.id as variation_id,
      v.name as variation_name,
      
      COUNT(DISTINCT CASE WHEN e."eventType" = 'view' THEN e."clickId" END) as views,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'conversion' AND e."eventName" = 'checkout_click' THEN e."clickId" END) as checkouts,
      COUNT(DISTINCT CASE WHEN e."eventType" = 'purchase' THEN e."clickId" END) as purchases,
      
      COALESCE(SUM(CASE WHEN e."eventType" = 'purchase' THEN e."eventValue" ELSE 0 END), 0) as revenue,
      
      ROUND(
        (COUNT(DISTINCT CASE WHEN e."eventType" = 'conversion' AND e."eventName" = 'checkout_click' THEN e."clickId" END) * 100.0 / 
        NULLIF(COUNT(DISTINCT CASE WHEN e."eventType" = 'view' THEN e."clickId" END), 0))::numeric, 
        2
      ) as checkout_rate,
      
      ROUND(
        (COUNT(DISTINCT CASE WHEN e."eventType" = 'purchase' THEN e."clickId" END) * 100.0 / 
        NULLIF(COUNT(DISTINCT CASE WHEN e."eventType" = 'view' THEN e."clickId" END), 0))::numeric, 
        2
      ) as purchase_rate,
      
      ROUND(
        (COALESCE(SUM(CASE WHEN e."eventType" = 'purchase' THEN e."eventValue" ELSE 0 END), 0) / 
        NULLIF(COUNT(DISTINCT CASE WHEN e."eventType" = 'purchase' THEN e."clickId" END), 0))::numeric,
        2
      ) as avg_order_value
      
    FROM "Variation" v
    LEFT JOIN "Event" e ON v.id = e."variationId" 
      AND e."createdAt" >= ${startDate}::timestamp 
      AND e."createdAt" <= ${endDate}::timestamp
    WHERE v."campaignId" = ${campaignId}
    GROUP BY v.id, v.name
    ORDER BY revenue DESC
  `;
  
  // Converter BigInt para Number
  const metrics = convertBigIntToNumber(metricsRaw);
  
  console.log('[Analytics] Metrics fetched:', metrics.length, 'variations');
  console.log('[Analytics] Sample metric:', metrics[0]);

  // Buscar dados do funil
  const funnelDataRaw = await db.$queryRaw`
    WITH funnel_steps AS (
      SELECT 
        "variationId",
        COUNT(DISTINCT CASE WHEN "eventType" = 'view' THEN "clickId" END) as step_views,
        COUNT(DISTINCT CASE WHEN "eventType" = 'engagement' AND "eventName" = 'video_play' THEN "clickId" END) as step_video_play,
        COUNT(DISTINCT CASE WHEN "eventType" = 'engagement' AND "eventName" = 'video_50' THEN "clickId" END) as step_video_50,
        COUNT(DISTINCT CASE WHEN "eventType" = 'engagement' AND "eventName" = 'video_complete' THEN "clickId" END) as step_video_complete,
        COUNT(DISTINCT CASE WHEN "eventType" = 'conversion' AND "eventName" = 'checkout_click' THEN "clickId" END) as step_checkout,
        COUNT(DISTINCT CASE WHEN "eventType" = 'purchase' THEN "clickId" END) as step_purchase
      FROM "Event"
      WHERE "campaignId" = ${campaignId}
        AND "createdAt" >= ${startDate}::timestamp 
        AND "createdAt" <= ${endDate}::timestamp
      GROUP BY "variationId"
    )
    SELECT * FROM funnel_steps
  `;
  
  // Converter BigInt para Number
  const funnelData = convertBigIntToNumber(funnelDataRaw);

  // Buscar timeline (últimos 30 dias)
  const timelineRaw = await db.$queryRaw`
    SELECT 
      DATE("createdAt") as date,
      "variationId",
      COUNT(DISTINCT CASE WHEN "eventType" = 'view' THEN "clickId" END) as views,
      COUNT(DISTINCT CASE WHEN "eventType" = 'conversion' THEN "clickId" END) as conversions,
      COUNT(DISTINCT CASE WHEN "eventType" = 'purchase' THEN "clickId" END) as purchases,
      COALESCE(SUM(CASE WHEN "eventType" = 'purchase' THEN "eventValue" ELSE 0 END), 0) as revenue
    FROM "Event"
    WHERE "campaignId" = ${campaignId}
      AND "createdAt" >= ${startDate}::timestamp 
      AND "createdAt" <= ${endDate}::timestamp
    GROUP BY DATE("createdAt"), "variationId"
    ORDER BY date ASC
  `;
  
  // Converter BigInt para Number
  const timeline = convertBigIntToNumber(timelineRaw);

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
