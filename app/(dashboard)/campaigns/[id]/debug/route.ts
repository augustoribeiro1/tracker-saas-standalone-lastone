// /app/api/campaigns/[id]/debug/route.ts
// CRIAR ESTE ARQUIVO TEMPORÁRIO PARA DEBUG

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

    // ✅ BUSCAR TODOS OS EVENTOS DA CAMPANHA (SEM FILTRO)
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
        eventType: true,
        eventName: true,
        eventValue: true,
        campaignId: true,
        variationId: true,
        createdAt: true
      }
    });

    // ✅ CONTAR POR TIPO
    const eventCounts = {
      checkout: allEvents.filter(e => e.eventType === 'checkout').length,
      purchase: allEvents.filter(e => e.eventType === 'purchase').length,
      other: allEvents.filter(e => e.eventType !== 'checkout' && e.eventType !== 'purchase').length
    };

    // ✅ CHECKOUTS DETALHADOS
    const checkouts = allEvents.filter(e => e.eventType === 'checkout');

    return NextResponse.json({
      campaignId,
      totalEvents: allEvents.length,
      eventCounts,
      checkouts: checkouts.map(c => ({
        id: c.id,
        eventType: c.eventType,
        variationId: c.variationId,
        hasVariationId: c.variationId !== null,
        createdAt: c.createdAt
      })),
      allEvents: allEvents.slice(0, 10) // Primeiros 10 para análise
    });

  } catch (error: any) {
    console.error('[Debug API] Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
