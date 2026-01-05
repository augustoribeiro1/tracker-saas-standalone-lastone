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

  // ✅ BUSCAR MÉTRICAS USANDO TABELAS CLICK E CONVERSION
  const metricsRaw = await db.$queryRaw`
    SELECT 
      v.id as variation_id,
      v.name as variation_name,
      
      COUNT(DISTINCT c.id) as views,
      COUNT(DISTINCT co.id) as checkouts,
      0 as purchases,
      
      0 as revenue,
      
      COALESCE(
        ROUND(
          (COUNT(DISTINCT co.id) * 100.0 / 
          NULLIF(COUNT(DISTINCT c.id), 0))::numeric, 
          2
        ),
        0
      ) as checkout_rate,
      
      0 as purchase_rate,
      0 as avg_order_value
      
    FROM "Variation" v
    LEFT JOIN "Click" c ON v.id = c."variationId" 
      AND DATE(c."createdAt") >= DATE(${startDate}::timestamp)
      AND DATE(c."createdAt") <= DATE(${endDate}::timestamp)
    LEFT JOIN "Conversion" co ON v.id = co."variationId"
      AND DATE(co."createdAt") >= DATE(${startDate}::timestamp)
      AND DATE(co."createdAt") <= DATE(${endDate}::timestamp)
    WHERE v."campaignId" = ${campaignId}
    GROUP BY v.id, v.name
    ORDER BY views DESC
  `;
  
  // Converter BigInt para Number
  const metrics = convertBigIntToNumber(metricsRaw);
  
  console.log('[Analytics] Metrics fetched:', metrics.length, 'variations');
  console.log('[Analytics] Sample metric:', metrics[0]);

  // ✅ BUSCAR DADOS DO FUNIL (SIMPLIFICADO - SÓ VIEWS E CONVERSÕES)
  const funnelDataRaw = await db.$queryRaw`
    WITH funnel_steps AS (
      SELECT 
        "variationId",
        COUNT(DISTINCT c.id) as step_views,
        0 as step_video_play,
        0 as step_video_50,
        0 as step_video_complete,
        COUNT(DISTINCT co.id) as step_checkout,
        0 as step_purchase
      FROM "Variation" v
      LEFT JOIN "Click" c ON v.id = c."variationId"
        AND DATE(c."createdAt") >= DATE(${startDate}::timestamp)
        AND DATE(c."createdAt") <= DATE(${endDate}::timestamp)
      LEFT JOIN "Conversion" co ON v.id = co."variationId"
        AND DATE(co."createdAt") >= DATE(${startDate}::timestamp)
        AND DATE(co."createdAt") <= DATE(${endDate}::timestamp)
      WHERE v."campaignId" = ${campaignId}
      GROUP BY v.id
    )
    SELECT * FROM funnel_steps
  `;
  
  // Converter BigInt para Number
  const funnelData = convertBigIntToNumber(funnelDataRaw);

  // ✅ BUSCAR TIMELINE USANDO CLICK E CONVERSION
  const timelineRaw = await db.$queryRaw`
    SELECT 
      date::date,
      COALESCE(SUM(views), 0) as views,
      COALESCE(SUM(conversions), 0) as conversions,
      0 as purchases,
      0 as revenue
    FROM (
      SELECT DATE("createdAt") as date, COUNT(*) as views, 0 as conversions
      FROM "Click"
      WHERE "campaignId" = ${campaignId}
        AND DATE("createdAt") >= DATE(${startDate}::timestamp)
        AND DATE("createdAt") <= DATE(${endDate}::timestamp)
      GROUP BY DATE("createdAt")
      
      UNION ALL
      
      SELECT DATE("createdAt") as date, 0 as views, COUNT(*) as conversions
      FROM "Conversion"
      WHERE "campaignId" = ${campaignId}
        AND DATE("createdAt") >= DATE(${startDate}::timestamp)
        AND DATE("createdAt") <= DATE(${endDate}::timestamp)
      GROUP BY DATE("createdAt")
    ) combined
    GROUP BY date
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