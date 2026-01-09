import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * ✅ CRON JOB: Limpeza automática de dados expirados
 * Roda diariamente às 3h da manhã (configurado no vercel.json)
 * Remove dados de clicks e events que passaram da data de expiração
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Verificar autorização (CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('[Cleanup] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cleanup] Starting data cleanup...');
    const startTime = Date.now();
    const now = new Date();

    // ✅ DELETAR CLICKS EXPIRADOS
    const deletedClicks = await db.click.deleteMany({
      where: {
        expiresAt: {
          lt: now // Menor que a data atual
        }
      }
    });

    console.log(`[Cleanup] Deleted ${deletedClicks.count} expired clicks`);

    // ✅ DELETAR EVENTS EXPIRADOS
    const deletedEvents = await db.event.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    console.log(`[Cleanup] Deleted ${deletedEvents.count} expired events`);

    const duration = Date.now() - startTime;

    console.log(`[Cleanup] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      deleted: {
        clicks: deletedClicks.count,
        events: deletedEvents.count
      },
      timestamp: now.toISOString(),
      durationMs: duration
    });
  } catch (error: any) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
