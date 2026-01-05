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

    // 1. Buscar webhook config
    const webhookConfig = await db.webhookConfiguration.findFirst({
      where: {
        platform: platform.toLowerCase(),
        webhookUrl: { contains: token }
      }
    });

    if (!webhookConfig) {
      console.error('[Webhook] Config not found for token:', token);
      // ✅ RETORNAR 200 MESMO SE NÃO ENCONTRAR (para não desativar webhook)
      return NextResponse.json({ 
        success: false, 
        message: 'Webhook config not found but returning 200' 
      }, { status: 200 });
    }

    // 2. Extrair tracking code do utm_term ou custom field
    const utmTerm = body.utm_term || body.utmTerm || body.tracking_code || '';
    const trackingData = utmTerm ? parseTrackingCode(utmTerm) : null;

    // ✅ Extrair outras UTMs
    const utmSource = body.utm_source || body.utmSource || null;
    const utmCampaign = body.utm_campaign || body.utmCampaign || null;
    const utmMedium = body.utm_medium || body.utmMedium || null;
    const utmContent = body.utm_content || body.utmContent || null;

    if (!trackingData) {
      console.warn('[Webhook] No tracking code found, registering as untracked conversion');
    }

    // 3. ✅ REGISTRAR CONVERSÃO MESMO SEM CLICKID
    try {
      // Se tiver trackingData, usar. Se não, deixar null
      await db.event.create({
        data: {
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
        clickId: trackingData?.clickId || 'untracked',
        value: body.price || body.amount
      });
    } catch (dbError) {
      console.error('[Webhook] Database error:', dbError);
      // ✅ CONTINUAR E RETORNAR 200 MESMO COM ERRO DE BANCO
    }

    // 4. Atualizar webhook stats
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
      // ✅ CONTINUAR E RETORNAR 200
    }

    // 5. Log do webhook
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
      // ✅ CONTINUAR E RETORNAR 200
    }

    // ✅ SEMPRE RETORNAR 200 OK
    return NextResponse.json({ 
      success: true,
      tracked: !!trackingData,
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
