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

    // 1. Buscar webhook config
    const webhookConfig = await db.webhookConfiguration.findFirst({
      where: {
        platform: platform.toLowerCase(),
        webhookUrl: { contains: token }
      }
    });

    if (!webhookConfig) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // 2. Extrair tracking code do utm_term ou custom field
    const utmTerm = body.utm_term || body.utmTerm || body.tracking_code || '';
    const trackingData = parseTrackingCode(utmTerm);

    if (!trackingData) {
      console.warn('No valid tracking code found in webhook payload');
      return NextResponse.json({ error: 'No tracking code found' }, { status: 400 });
    }

    // 3. Registrar evento de compra
    await db.event.create({
      data: {
        clickId: trackingData.clickId,
        campaignId: trackingData.testId,
        variationId: trackingData.variationId,
        eventType: 'purchase',
        eventName: body.product_name || body.productName || 'Purchase',
        eventValue: parseFloat(body.price || body.amount || 0),
        utmTerm: utmTerm,
      }
    });

    // 4. Atualizar webhook stats
    await db.webhookConfiguration.update({
      where: { id: webhookConfig.id },
      data: {
        totalReceived: { increment: 1 },
        lastReceivedAt: new Date()
      }
    });

    // 5. Log do webhook
    await db.webhookLog.create({
      data: {
        webhookId: webhookConfig.id,
        payload: JSON.stringify(body),
        statusCode: 200
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
