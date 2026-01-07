// /app/api/campaigns/[id]/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
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
    const body = await request.json();
    const { confirmation } = body;

    // ✅ VERIFICAR CONFIRMAÇÃO
    if (confirmation !== 'resetar campanha') {
      return NextResponse.json(
        { error: 'Confirmação inválida. Digite exatamente: resetar campanha' },
        { status: 400 }
      );
    }

    // ✅ VERIFICAR SE CAMPANHA PERTENCE AO USUÁRIO
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        userId: userId
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    console.log('[Reset Campaign] User:', userId, 'Campaign:', campaignId);

    // ✅ APAGAR DADOS EM TRANSAÇÃO (TUDO OU NADA)
    const result = await db.$transaction(async (tx) => {
      // 1. Apagar CLICKS (views)
      const deletedClicks = await tx.click.deleteMany({
        where: { campaignId: campaignId }
      });

      // 2. Apagar EVENTS (checkouts + purchases)
      const deletedEvents = await tx.event.deleteMany({
        where: { campaignId: campaignId }
      });

      console.log('[Reset Campaign] Deleted clicks:', deletedClicks.count);
      console.log('[Reset Campaign] Deleted events:', deletedEvents.count);

      return {
        clicks: deletedClicks.count,
        events: deletedEvents.count
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Dados da campanha resetados com sucesso!',
      deleted: {
        clicks: result.clicks,
        events: result.events,
        total: result.clicks + result.events
      }
    });

  } catch (error) {
    console.error('[Reset Campaign API] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao resetar campanha' },
      { status: 500 }
    );
  }
}
