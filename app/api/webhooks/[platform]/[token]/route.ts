// /app/api/webhooks/[platform]/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const CLICKID_PREFIX = 'split2_';

/**
 * ✅ BUSCA RECURSIVA MELHORADA (com debug)
 * Aceita formato: 17-33-split2_FxmROdTF92_f4r6uVs3s
 */
function findClickIdInObject(obj: any, path: string = 'root'): string | null {
  if (!obj) return null;

  // Se for string, verificar se contém split2_
  if (typeof obj === 'string') {
    // Regex aceita IDs antes do prefixo: 17-33-split2_xxx
    const regex = new RegExp(`${CLICKID_PREFIX}[A-Za-z0-9_-]{20}`, 'g');
    const match = obj.match(regex);
    if (match) {
      console.log(`[Debug] Found split2_ at path: ${path}, value: ${obj}`);
      return match[0];
    }
    return null;
  }

  // Se for array
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = findClickIdInObject(obj[i], `${path}[${i}]`);
      if (result) return result;
    }
    return null;
  }

  // Se for objeto
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Log cada campo checado
        const value = obj[key];
        if (typeof value === 'string' && value.includes('split2_')) {
          console.log(`[Debug] Checking ${path}.${key}: ${value}`);
        }
        
        const result = findClickIdInObject(value, `${path}.${key}`);
        if (result) return result;
      }
    }
  }

  return null;
}

/**
 * ✅ BUSCA UNIVERSAL DE VALOR MONETÁRIO
 */
function findValueInObject(obj: any): number | null {
  if (!obj) return null;

  const searchTerms = [
    'charge_amount',
    'price',
    'amount',
    'total',
    'value',
    'total_price',
    'subtotal',
    'grand_total'
  ];

  function search(o: any): any {
    if (!o) return null;

    if (typeof o === 'object' && !Array.isArray(o)) {
      for (const term of searchTerms) {
        if (o[term] !== undefined && o[term] !== null) {
          return o[term];
        }
      }

      for (const key in o) {
        if (o.hasOwnProperty(key)) {
          const result = search(o[key]);
          if (result !== null) return result;
        }
      }
    }

    if (Array.isArray(o)) {
      for (const item of o) {
        const result = search(item);
        if (result !== null) return result;
      }
    }

    return null;
  }

  const rawValue = search(obj);
  if (rawValue === null || rawValue === undefined) return null;

  let numValue: number;

  if (typeof rawValue === 'string') {
    const cleaned = rawValue.replace(/[^0-9.,]/g, '').replace(',', '.');
    numValue = parseFloat(cleaned);
  } else if (typeof rawValue === 'number') {
    numValue = rawValue;
  } else {
    return null;
  }

  if (isNaN(numValue)) return null;

  // Se > 1000, provavelmente está em centavos
  if (numValue > 1000) {
    numValue = numValue / 100;
  }

  return numValue;
}

/**
 * ✅ EXTRAÇÃO DE NOME DO PRODUTO
 */
function extractProductName(obj: any): string {
  const searchTerms = [
    'product_name',
    'product',
    'item_name',
    'name',
    'title',
    'order_name',
    'number'
  ];

  function search(o: any): string | null {
    if (!o) return null;

    if (typeof o === 'object' && !Array.isArray(o)) {
      for (const term of searchTerms) {
        if (o[term] && typeof o[term] === 'string') {
          return o[term];
        }
      }

      for (const key in o) {
        if (o.hasOwnProperty(key)) {
          const result = search(o[key]);
          if (result) return result;
        }
      }
    }

    if (Array.isArray(o)) {
      for (const item of o) {
        const result = search(item);
        if (result) return result;
      }
    }

    return null;
  }

  return search(obj) || 'Unknown Product';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string; token: string } }
) {
  try {
    const { platform, token } = params;
    const body = await request.json();

    console.log('[Webhook] Received:', platform, JSON.stringify(body, null, 2));

    // ✅ VALIDAR TOKEN
    const user = await db.user.findUnique({
      where: { webhookToken: token }
    });

    if (!user) {
      console.log('[Webhook] Invalid token:', token);
      return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 });
    }

    console.log('[Webhook] User found:', user.email);

    // ✅ BUSCAR CLICKID COM DEBUG
    console.log('[Webhook] Searching for split2_ prefix...');
    const clickIdWithPrefix = findClickIdInObject(body);
    
    if (!clickIdWithPrefix) {
      console.log('[Webhook] ❌ NO split2_ found in entire payload');
      console.log('[Webhook] Payload keys:', Object.keys(body));
      
      // Debug: mostrar campos que contêm "utm"
      const utmFields: any = {};
      function findUtm(obj: any, path: string = 'root') {
        if (!obj) return;
        if (typeof obj === 'string' && path.includes('utm')) {
          utmFields[path] = obj;
        }
        if (typeof obj === 'object') {
          for (const key in obj) {
            if (key.toLowerCase().includes('utm')) {
              utmFields[`${path}.${key}`] = obj[key];
            }
            findUtm(obj[key], `${path}.${key}`);
          }
        }
      }
      findUtm(body);
      console.log('[Webhook] UTM fields found:', utmFields);
      
      // Registrar como conversão não rastreada
      console.warn('[Webhook] No clickId found (no split2_ prefix), registering as untracked conversion');
      
      const value = findValueInObject(body);
      const productName = extractProductName(body);

      console.log('[Webhook] Extracted data:', {
        clickId: 'none',
        value,
        productName
      });

      const event = await db.event.create({
        data: {
          eventType: 'purchase',
          eventName: productName,
          eventValue: value || 0,
          clickId: 'untracked',
          userId: user.id
        }
      });

      console.log('[Webhook] Conversion registered:', {
        userId: user.id,
        clickId: 'untracked',
        value: value || 0,
        product: productName,
        tracked: false
      });

      return NextResponse.json({
        success: true,
        tracked: false,
        eventId: event.id
      });
    }

    // ✅ CLICKID ENCONTRADO!
    console.log('[Webhook] ✅ Found clickId with prefix:', clickIdWithPrefix);

    // Remover prefixo split2_
    const clickId = clickIdWithPrefix.replace(CLICKID_PREFIX, '');
    console.log('[Webhook] Clean clickId:', clickId);

    // ✅ BUSCAR CLICK NO BANCO
    const click = await db.click.findUnique({
      where: { clickid: clickId },
      include: {
        campaign: true,
        variation: true
      }
    });

    if (!click) {
      console.warn('[Webhook] Click not found in database:', clickId);
      
      // Registrar como não rastreado mesmo com split2_
      const value = findValueInObject(body);
      const productName = extractProductName(body);

      const event = await db.event.create({
        data: {
          eventType: 'purchase',
          eventName: productName,
          eventValue: value || 0,
          clickId: clickId, // Guarda o clickId mesmo não encontrando
          userId: user.id
        }
      });

      return NextResponse.json({
        success: true,
        tracked: false,
        reason: 'click_not_found',
        eventId: event.id
      });
    }

    console.log('[Webhook] Click found:', {
      clickId: click.clickid,
      campaignId: click.campaignId,
      variationId: click.variationId
    });

    // ✅ EXTRAIR VALOR E PRODUTO
    const value = findValueInObject(body);
    const productName = extractProductName(body);

    console.log('[Webhook] Extracted data:', {
      clickId,
      value,
      productName
    });

    // ✅ REGISTRAR CONVERSÃO
    const event = await db.event.create({
      data: {
        eventType: 'purchase',
        eventName: productName,
        eventValue: value || 0,
        clickId: click.clickid, // ✅ Usar clickid (string) não id (number)
        campaignId: click.campaignId,
        variationId: click.variationId
      }
    });

    console.log('[Webhook] ✅ Conversion tracked:', {
      eventId: event.id,
      clickId: click.clickid,
      campaignId: click.campaignId,
      variationId: click.variationId,
      value: value || 0,
      product: productName
    });

    return NextResponse.json({
      success: true,
      tracked: true,
      eventId: event.id,
      campaignId: click.campaignId,
      variationId: click.variationId
    });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { success: true }, // ✅ Sempre retorna 200 OK
      { status: 200 }
    );
  }
}

// ✅ Aceita GET também (algumas plataformas fazem verificação)
export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string; token: string } }
) {
  return NextResponse.json({
    status: 'ok',
    platform: params.platform,
    message: 'Webhook endpoint is ready'
  });
}
