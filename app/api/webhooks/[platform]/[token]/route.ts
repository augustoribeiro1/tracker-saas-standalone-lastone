import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseTrackingCode } from '@/types';

// ✅ FUNÇÃO UNIVERSAL: Busca recursiva em qualquer estrutura JSON
function findValueInObject(obj: any, searchTerms: string[]): any {
  if (!obj || typeof obj !== 'object') return null;

  // Buscar no nível atual
  for (const searchTerm of searchTerms) {
    for (const key in obj) {
      if (key.toLowerCase().includes(searchTerm.toLowerCase())) {
        const value = obj[key];
        // Retornar apenas se não for null/undefined/empty
        if (value !== null && value !== undefined && value !== '') {
          return value;
        }
      }
    }
  }

  // Buscar recursivamente em objetos aninhados
  for (const key in obj) {
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const found = findValueInObject(value, searchTerms);
      if (found !== null && found !== undefined && found !== '') {
        return found;
      }
    }
  }

  return null;
}

// ✅ FUNÇÃO UNIVERSAL: Extrai valor monetário com detecção de centavos
function extractMonetaryValue(obj: any): number {
  // Ordem de prioridade para busca
  const priceTerms = [
    ['charge_amount', 'charge'],           // Kiwify
    ['price', 'product_price'],            // Hotmart, outros
    ['amount', 'total_amount', 'value'],   // Genéricos
    ['total', 'order_value']               // Alternativos
  ];

  for (const terms of priceTerms) {
    const value = findValueInObject(obj, terms);
    if (value !== null) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        // ✅ Detectar se está em centavos (valores > 1000 provavelmente são)
        // Exemplo: 6567 centavos = R$ 65,67
        if (numValue >= 1000) {
          return numValue / 100;
        }
        return numValue;
      }
    }
  }

  return 0;
}

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

    // ✅ 3. EXTRAÇÃO UNIVERSAL DE UTMs (funciona com qualquer estrutura)
    const utmTerm = findValueInObject(body, ['utm_term', 'utmterm', 'tracking_code']);
    const trackingData = utmTerm ? parseTrackingCode(utmTerm) : null;

    const utmSource = findValueInObject(body, ['utm_source', 'utmsource']);
    const utmCampaign = findValueInObject(body, ['utm_campaign', 'utmcampaign']);
    const utmMedium = findValueInObject(body, ['utm_medium', 'utmmedium']);
    const utmContent = findValueInObject(body, ['utm_content', 'utmcontent']);

    // ✅ 4. EXTRAÇÃO UNIVERSAL DE VALOR (detecta centavos automaticamente)
    const eventValue = extractMonetaryValue(body);
    
    // ✅ 5. EXTRAÇÃO UNIVERSAL DE NOME DO PRODUTO
    const productName = findValueInObject(body, [
      'product_name', 
      'productname', 
      'product', 
      'item_name',
      'name'
    ]) || 'Purchase';

    if (!trackingData) {
      console.warn('[Webhook] No tracking code found, registering as untracked conversion');
    }

    console.log('[Webhook] Extracted data:', {
      utmTerm: utmTerm || 'none',
      value: eventValue,
      productName
    });

    // ✅ 6. REGISTRAR CONVERSÃO VINCULADA AO USUÁRIO
    try {
      await db.event.create({
        data: {
          userId: user.id,
          clickId: trackingData?.clickId || null,
          campaignId: trackingData?.testId || null,
          variationId: trackingData?.variationId || null,
          eventType: 'purchase',
          eventName: productName,
          eventValue: eventValue,
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
        value: eventValue,
        product: productName
      });
    } catch (dbError) {
      console.error('[Webhook] Database error:', dbError);
      // Continuar e retornar 200 mesmo com erro
    }

    // 7. Atualizar webhook stats (se config existe)
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

      // 8. Log do webhook
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
