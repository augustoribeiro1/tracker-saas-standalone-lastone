import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseTrackingCode } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string; token: string } }
) {
  try {
    const { platform, token } = params;
    const body = await request.json();

    console.log('[Webhook] Received:', platform, body);

    // ✅ 1. BUSCAR USUÁRIO PELO TOKEN (não mais pelo webhook config)
    const user = await db.user.findUnique({
      where: { webhookToken: token },
      select: { id: true, email: true }
    });

    if (!user) {
      console.error('[Webhook] User not found for token:', token);
      // Retornar 200 para não desativar webhook
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid webhook token but returning 200' 
      }, { status: 200 });
    }

    console.log('[Webhook] User found:', user.email);

    // ✅ 2. BUSCAR WEBHOOK CONFIG (para stats)
    const webhookConfig = await db.webhookConfiguration.findFirst({
      where: {
        userId: user.id,
        platform: platform.toLowerCase()
      }
    });

    // 3. Extrair tracking code do utm_term ou custom field
    const utmTerm = body.utm_term || body.utmTerm || body.tracking_code || '';
    const trackingData = utmTerm ? parseTrackingCode(utmTerm) : null;

    // Extrair outras UTMs
    const utmSource = body.utm_source || body.utmSource || null;
    const utmCampaign = body.utm_campaign || body.utmCampaign || null;
    const utmMedium = body.utm_medium || body.utmMedium || null;
    const utmContent = body.utm_content || body.utmContent || null;

    if (!trackingData) {
      console.warn('[Webhook] No tracking code found, registering as untracked conversion');
    }

    // ✅ 4. REGISTRAR CONVERSÃO VINCULADA AO USUÁRIO
    try {
      await db.event.create({
        data: {
          userId: user.id,                            // ✅ SEMPRE vincula ao dono do webhook
          clickId: trackingData?.clickId || null,
          campaignId: trackingData?.testId || null,
          variationId: trackingData?.variationId || null,
          eventType: 'purchase',
          eventName: body.product_name || body.productName || 'Purchase',
          eventValue: parseFloat(body.price || body.amount || 0),
          utmTerm: utmTerm || null,
          utmSource: utmSource,
          utmCampaign: utmCampaign,
          utmMedium: utmMedium,
          utmContent: utmContent,
        }
      });

      console.log('[Webhook] Conversion registered:', {
        userId: user.id,
        clickId: trackingData?.clickId || 'untracked',
        value: body.price || body.amount
      });
    } catch (dbError) {
      console.error('[Webhook] Database error:', dbError);
      // Continuar e retornar 200 mesmo com erro
    }

    // 5. Atualizar webhook stats (se config existe)
    if (webhookConfig) {
      try {
        await db.webhookConfiguration.update({
          where: { id: webhookConfig.id },
          data: {
            totalReceived: { increment: 1 },
            lastReceivedAt: new Date()
          }
        });
      } catch (updateError) {
        console.error('[Webhook] Failed to update stats:', updateError);
      }

      // 6. Log do webhook
      try {
        await db.webhookLog.create({
          data: {
            webhookId: webhookConfig.id,
            payload: JSON.stringify(body),
            statusCode: 200
          }
        });
      } catch (logError) {
        console.error('[Webhook] Failed to create log:', logError);
      }
    }

    // ✅ SEMPRE RETORNAR 200 OK
    return NextResponse.json({ 
      success: true,
      tracked: !!trackingData,
      userId: user.id,
      message: trackingData ? 'Conversion tracked' : 'Conversion registered as untracked'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Webhook] Processing error:', error);
    
    // ✅ MESMO COM ERRO GERAL, RETORNAR 200
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal error but returning 200 to prevent webhook deactivation',
        message: error.message 
      },
      { status: 200 }
    );
  }
}
