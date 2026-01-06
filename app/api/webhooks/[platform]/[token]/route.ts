import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const CLICKID_PREFIX = 'split2_';  // ✅ PREFIXO ÚNICO E INCONFUNDÍVEL

// ✅ BUSCA UNIVERSAL: Procura clickId com prefixo split2_ em qualquer lugar do JSON
function findClickIdInObject(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  // Buscar em todas as chaves e valores
  for (const key in obj) {
    const value = obj[key];
    
    // Se o valor é uma string e contém o prefixo
    if (typeof value === 'string' && value.includes(CLICKID_PREFIX)) {
      // Procurar pelo padrão split2_[20 chars]
      const match = value.match(/split2_[A-Za-z0-9]{20}/);
      if (match) {
        return match[0]; // Retorna com prefixo
      }
    }
    
    // Se o valor é um objeto ou array, buscar recursivamente
    if (value && typeof value === 'object') {
      const found = findClickIdInObject(value);
      if (found) return found;
    }
  }

  return null;
}

// ✅ FUNÇÃO UNIVERSAL: Busca recursiva em qualquer estrutura JSON
function findValueInObject(obj: any, searchTerms: string[]): any {
  if (!obj || typeof obj !== 'object') return null;

  // Buscar no nível atual
  for (const searchTerm of searchTerms) {
    for (const key in obj) {
      if (key.toLowerCase().includes(searchTerm.toLowerCase())) {
        const value = obj[key];
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
    ['value', 'payment_value'],               // CartPanda, outros
    ['charge_amount', 'charge'],              // Kiwify
    ['price', 'product_price', 'total_price'], // Hotmart, outros
    ['amount', 'total_amount'],               // Genéricos
    ['total', 'order_value']                  // Alternativos
  ];

  for (const terms of priceTerms) {
    const value = findValueInObject(obj, terms);
    if (value !== null) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        // ✅ Detectar se está em centavos (valores >= 100 provavelmente são)
        // CartPanda: 750 = R$ 7,50
        // Kiwify: 6567 = R$ 65,67
        // Outros: valores pequenos (< 100) provavelmente já estão em reais
        if (numValue >= 100) {
          return numValue / 100;
        }
        return numValue;
      }
    }
  }

  return 0;
}

// ✅ PARSE TRACKING CODE: Extrai testId, variationId e clickId
function parseTrackingCode(trackingCode: string) {
  // Formato esperado: testId-variationId-split2_clickId
  const parts = trackingCode.split('-');
  
  if (parts.length >= 3) {
    return {
      testId: parseInt(parts[0]),
      variationId: parseInt(parts[1]),
      clickId: parts.slice(2).join('-')  // Pode ter mais de um hífen no clickId
    };
  }
  
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string; token: string } }
) {
  try {
    const { platform, token } = params;
    const body = await request.json();

    console.log('[Webhook] Received:', platform, body);

    // ✅ 1. BUSCAR USUÁRIO PELO TOKEN
    const user = await db.user.findUnique({
      where: { webhookToken: token },
      select: { id: true, email: true }
    });

    if (!user) {
      console.error('[Webhook] User not found for token:', token);
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

    // ✅ 3. BUSCA UNIVERSAL DE CLICKID (com prefixo split2_)
    const clickIdWithPrefix = findClickIdInObject(body);
    
    let trackingData = null;
    let clickId = null;
    
    if (clickIdWithPrefix) {
      // Remove o prefixo antes de processar
      const cleanClickId = clickIdWithPrefix.replace(CLICKID_PREFIX, '');
      
      // Tentar fazer parse do tracking code completo
      // Primeiro procura utm_term que pode ter formato: testId-varId-split2_clickId
      const utmTerm = findValueInObject(body, ['utm_term', 'utmterm', 'tracking_code']);
      
      if (utmTerm && utmTerm.includes('-')) {
        trackingData = parseTrackingCode(utmTerm);
        if (trackingData) {
          // Remove prefixo do clickId parseado também
          trackingData.clickId = trackingData.clickId.replace(CLICKID_PREFIX, '');
        }
      }
      
      // Se não conseguiu parsear, usar só o clickId
      if (!trackingData) {
        clickId = cleanClickId;
        console.log('[Webhook] Found clickId via split2_ prefix:', clickId);
      } else {
        clickId = trackingData.clickId;
        console.log('[Webhook] Parsed full tracking code:', trackingData);
      }
    }

    // Extrair UTMs
    const utmSource = findValueInObject(body, ['utm_source', 'utmsource']);
    const utmCampaign = findValueInObject(body, ['utm_campaign', 'utmcampaign']);
    const utmMedium = findValueInObject(body, ['utm_medium', 'utmmedium']);
    const utmContent = findValueInObject(body, ['utm_content', 'utmcontent']);

    // ✅ 4. EXTRAÇÃO UNIVERSAL DE VALOR
    const eventValue = extractMonetaryValue(body);
    
    // ✅ 5. EXTRAÇÃO UNIVERSAL DE NOME DO PRODUTO
    const productName = findValueInObject(body, [
      'product_name', 
      'productname', 
      'product', 
      'item_name',
      'name'
    ]) || 'Purchase';

    if (!clickId) {
      console.warn('[Webhook] No clickId found (no split2_ prefix), registering as untracked conversion');
    }

    console.log('[Webhook] Extracted data:', {
      clickId: clickId || 'none',
      value: eventValue,
      productName
    });

    // ✅ 6. REGISTRAR CONVERSÃO
    try {
      await db.event.create({
        data: {
          userId: user.id,
          clickId: clickId || null,
          campaignId: trackingData?.testId || null,
          variationId: trackingData?.variationId || null,
          eventType: 'purchase',
          eventName: productName,
          eventValue: eventValue,
          utmTerm: findValueInObject(body, ['utm_term', 'utmterm']) || null,
          utmSource: utmSource,
          utmCampaign: utmCampaign,
          utmMedium: utmMedium,
          utmContent: utmContent,
        }
      });

      console.log('[Webhook] Conversion registered:', {
        userId: user.id,
        clickId: clickId || 'untracked',
        value: eventValue,
        product: productName,
        tracked: !!trackingData
      });
    } catch (dbError) {
      console.error('[Webhook] Database error:', dbError);
    }

    // 7. Atualizar webhook stats
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
      clickId: clickId || null,
      userId: user.id,
      message: clickId ? 'Conversion tracked with clickId' : 'Conversion registered as untracked'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Webhook] Processing error:', error);
    
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
