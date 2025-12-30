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

  // Buscar TODOS os eventos desta campanha (sem filtro de data)
  const allEvents = await db.event.findMany({
    where: {
      campaignId: campaignId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50,
    select: {
      id: true,
      clickId: true,
      eventType: true,
      variationId: true,
      createdAt: true,
      ipAddress: true
    }
  });

  // Contar por variação
  const countByVariation = await db.event.groupBy({
    by: ['variationId'],
    where: {
      campaignId: campaignId,
      eventType: 'view'
    },
    _count: {
      id: true
    }
  });

  return NextResponse.json({
    campaignId,
    totalEvents: allEvents.length,
    events: allEvents,
    countByVariation,
    serverTime: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
}
