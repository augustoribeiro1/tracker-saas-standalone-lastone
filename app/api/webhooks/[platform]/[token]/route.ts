import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseTrackingCode } from '@/types';
import { WEBHOOK_PLATFORMS } from '@/lib/webhook-platforms';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string; token: string } }
) {
  const { platform, token } = params;
  
  try {
    // 1. Buscar configuração do webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/${platform}/${token}`;
    const config = await db.webhookConfiguration.findFirst({
      where: {
        webhookUrl,
        status: 'active'
      }
    });
    
    if (!config) {
      await logWebhook(webhookUrl, platform, null, 'not_found');
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }
    
    // 2. Processar payload
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    
    // 3. Validar assinatura
    const platformConfig = WEBHOOK_PLATFORMS[platform.toLowerCase()];
    if (platformConfig?.signatureValidation) {
      const isValid = validateSignature(
        request,
        rawBody,
        platformConfig.signatureValidation,
        config.webhookSecret
      );
      
      if (!isValid) {
        await logWebhook(webhookUrl, platform, payload, 'invalid_signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    // 4. Extrair dados usando field mapping
    const extractedData = extractWebhookData(payload, platformConfig.fieldMapping);
    
    // 5. Extrair Click ID da utm_term
    const utmTerm = extractedData.utmTerm || '';
    const trackingData = parseTrackingCode(utmTerm);
    
    if (!trackingData) {
      await logWebhook(webhookUrl, platform, payload, 'no_tracking_data', extractedData);
      return NextResponse.json({ status: 'no_tracking_data' }, { status: 200 });
    }
    
    // 6. Determinar tipo de evento
    const eventType = determineEventType(payload, platform);
    
    // 7. Registrar evento
    await db.event.create({
      data: {
        eventType,
        eventName: eventType,
        clickId: trackingData.clickId,
        campaignId: trackingData.testId,
        variationId: trackingData.variationId,
        eventValue: parseFloat(extractedData.amount) || 0,
        utmSource: extractedData.utmSource,
        utmMedium: extractedData.utmMedium,
        utmCampaign: extractedData.utmCampaign,
        utmTerm: extractedData.utmTerm,
        metadata: {
          orderId: extractedData.orderId,
          platform: platform,
          currency: extractedData.currency || 'BRL',
          customerEmail: extractedData.customerEmail,
          rawPayload: payload
        }
      }
    });
    
    // 8. Atualizar stats do webhook
    await db.webhookConfiguration.update({
      where: { id: config.id },
      data: {
        lastReceivedAt: new Date(),
        totalReceived: { increment: 1 }
      }
    });
    
    await logWebhook(webhookUrl, platform, payload, 'success', extractedData);
    
    return NextResponse.json({ status: 'ok' }, { status: 200 });
    
  } catch (error) {
    console.error('[Webhook Error]', error);
    await logWebhook(
      `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/${platform}/${token}`,
      platform,
      null,
      'error',
      null,
      error.message
    );
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

function extractWebhookData(payload: any, fieldMapping: Record<string, string>) {
  const data: any = {};
  
  for (const [key, path] of Object.entries(fieldMapping)) {
    data[key] = getNestedValue(payload, path);
  }
  
  return data;
}

function getNestedValue(obj: any, path: string) {
  return path.split('.').reduce((current, key) => {
    const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
    if (arrayMatch) {
      const [_, arrayKey, index] = arrayMatch;
      return current?.[arrayKey]?.[parseInt(index)];
    }
    return current?.[key];
  }, obj);
}

function determineEventType(payload: any, platform: string): string {
  const eventMappings: Record<string, Record<string, string>> = {
    kiwify: {
      'purchase.approved': 'purchase',
      'purchase.refunded': 'refund',
      'purchase.chargeback': 'chargeback'
    },
    hotmart: {
      'PURCHASE_COMPLETE': 'purchase',
      'PURCHASE_REFUNDED': 'refund',
      'PURCHASE_CHARGEBACK': 'chargeback'
    },
    stripe: {
      'checkout.session.completed': 'purchase',
      'charge.refunded': 'refund'
    }
  };
  
  const event = payload.event || payload.data?.event || payload.status;
  return eventMappings[platform]?.[event] || 'purchase';
}

function validateSignature(
  request: NextRequest,
  rawBody: string,
  validationConfig: any,
  secret: string
): boolean {
  const signature = request.headers.get(validationConfig.header);
  if (!signature) return false;
  
  if (validationConfig.algorithm === 'sha256') {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  }
  
  return false;
}

async function logWebhook(
  webhookUrl: string,
  platform: string,
  payload: any,
  status: string,
  extractedData?: any,
  errorMsg?: string
) {
  try {
    await db.webhookLog.create({
      data: {
        webhookUrl,
        platform,
        payload: payload || {},
        headers: {},
        status,
        errorMsg,
        orderId: extractedData?.orderId,
        clickId: extractedData?.clickId,
        campaignId: extractedData?.campaignId,
        variationId: extractedData?.variationId
      }
    });
  } catch (error) {
    console.error('[Log Webhook Error]', error);
  }
}
