import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateClickId, parseTrackingCode, generateTrackingCode } from '@/types';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const searchParams = request.nextUrl.searchParams;
  
  try {
    // 1. Buscar campanha
    const campaign = await db.campaign.findUnique({
      where: { slug, status: 'active' },
      include: { 
        variations: { 
          orderBy: { id: 'asc' }
        } 
      }
    });
    
    if (!campaign || campaign.variations.length === 0) {
      return new NextResponse('Campaign not found', { status: 404 });
    }
    
    // 2. Verificar utm_term existente (visitante retornando)
    const existingUtmTerm = searchParams.get('utm_term');
    let clickId: string | undefined;
    let variationId: number | undefined;
    
    if (existingUtmTerm) {
      const trackingData = parseTrackingCode(existingUtmTerm);
      if (trackingData && trackingData.testId === campaign.id) {
        clickId = trackingData.clickId;
        variationId = trackingData.variationId;
      }
    }
    
    // 3. Novo visitante - selecionar variação
    if (!clickId) {
      clickId = generateClickId();
      const variation = selectVariation(campaign.variations);
      variationId = variation.id;
      
      // Registrar view (fire and forget)
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'view',
          clickId,
          campaignId: campaign.id,
          variationId,
          utmSource: searchParams.get('utm_source'),
          utmMedium: searchParams.get('utm_medium'),
          utmCampaign: searchParams.get('utm_campaign'),
          utmContent: searchParams.get('utm_content'),
          ipAddress: request.headers.get('x-forwarded-for'),
          userAgent: request.headers.get('user-agent')
        })
      }).catch(console.error);
    }
    
    // 4. Buscar URL de destino
    const variation = campaign.variations.find(v => v.id === variationId);
    if (!variation) {
      return new NextResponse('Variation not found', { status: 404 });
    }
    
    // 5. Construir URL final
    const destinationUrl = new URL(variation.destinationUrl);
    
    // Preservar UTMs
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(param => {
      const value = searchParams.get(param);
      if (value) destinationUrl.searchParams.set(param, value);
    });
    
    // Injetar tracking na utm_term
    const trackingCode = generateTrackingCode(campaign.id, variationId!, clickId);
    destinationUrl.searchParams.set('utm_term', trackingCode);
    
    // 6. Redirect 302
    return NextResponse.redirect(destinationUrl.toString(), 302);
    
  } catch (error) {
    console.error('[Redirector Error]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function selectVariation(variations: any[]) {
  const totalWeight = variations.reduce((sum, v) => sum + v.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  
  for (const variation of variations) {
    cumulative += variation.weight;
    if (random <= cumulative) return variation;
  }
  
  return variations[0];
}
