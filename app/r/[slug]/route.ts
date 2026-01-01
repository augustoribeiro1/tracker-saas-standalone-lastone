import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateClickId, parseTrackingCode, generateTrackingCode } from '@/types';

// Removido: export const runtime = 'edge'; 
// Prisma não funciona no Edge Runtime, então usamos Node.js runtime

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const searchParams = request.nextUrl.searchParams;
  
  // Pegar hostname do Worker (X-Forwarded-Host) ou do request direto
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('x-original-host');
  const requestHost = forwardedHost || request.headers.get('host') || '';
  
  console.log('[/r] Request host:', requestHost, 'Forwarded:', forwardedHost);
  
  try {
    // 1. Buscar campanha pelo slug E domínio
    // Primeiro tentar encontrar pelo domínio customizado
    let campaign = await db.campaign.findFirst({
      where: { 
        slug,
        status: 'active',
        customDomain: {
          domain: requestHost
        }
      },
      include: { 
        variations: { 
          orderBy: { id: 'asc' }
        },
        customDomain: true
      }
    });
    
    // Se não encontrou com domínio customizado, buscar sem domínio
    // (para URLs do tipo *.vercel.app)
    if (!campaign) {
      campaign = await db.campaign.findFirst({
        where: { 
          slug,
          status: 'active',
          customDomain: null
        },
        include: { 
          variations: { 
            orderBy: { id: 'asc' }
          },
          customDomain: true
        }
      });
    }
    
    if (!campaign || campaign.variations.length === 0) {
      return new NextResponse('Campaign not found', { status: 404 });
    }
    
    console.log('[Redirect] Campaign found:', { 
      slug, 
      campaignId: campaign.id, 
      domain: campaign.customDomain?.domain || 'default',
      requestHost 
    });
    
    // 2. Verificar utm_term existente (visitante retornando)
    const existingUtmTerm = searchParams.get('utm_term');
    let clickId: string;
    let selectedVariationId: number;
    
    if (existingUtmTerm) {
      const trackingData = parseTrackingCode(existingUtmTerm);
      if (trackingData && trackingData.testId === campaign.id) {
        clickId = trackingData.clickId;
        selectedVariationId = trackingData.variationId;
        console.log('[Redirect] Returning visitor:', { clickId, variationId: selectedVariationId, utm_term: existingUtmTerm });
      } else {
        // utm_term inválido, tratar como novo visitante
        clickId = generateClickId();
        const variation = selectVariation(campaign.variations);
        selectedVariationId = variation.id;
        console.log('[Redirect] New visitor (invalid utm_term):', { clickId, variationId: selectedVariationId, selectedName: variation.name, weights: campaign.variations.map((v: any) => ({ name: v.name, weight: v.weight })) });
        
        // Registrar view
        await createViewEvent(campaign.id, selectedVariationId, clickId, request, searchParams);
      }
    } else {
      // Novo visitante
      clickId = generateClickId();
      const variation = selectVariation(campaign.variations);
      selectedVariationId = variation.id;
      console.log('[Redirect] New visitor:', { clickId, variationId: selectedVariationId, selectedName: variation.name, weights: campaign.variations.map((v: any) => ({ name: v.name, weight: v.weight })) });
      
      // Registrar view
      await createViewEvent(campaign.id, selectedVariationId, clickId, request, searchParams);
    }
    
    // 4. Buscar URL de destino
    const variation = campaign.variations.find(v => v.id === selectedVariationId);
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
    const trackingCode = generateTrackingCode(campaign.id, selectedVariationId, clickId);
    destinationUrl.searchParams.set('utm_term', trackingCode);
    
    // 6. Redirect 302
    return NextResponse.redirect(destinationUrl.toString(), 302);
    
  } catch (error) {
    console.error('[Redirector Error]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Helper function para criar evento de view
async function createViewEvent(
  campaignId: number,
  variationId: number,
  clickId: string,
  request: NextRequest,
  searchParams: URLSearchParams
) {
  try {
    await db.event.create({
      data: {
        clickId,
        campaignId,
        variationId,
        eventType: 'view',
        eventName: null,
        eventValue: null,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        utmSource: searchParams.get('utm_source'),
        utmMedium: searchParams.get('utm_medium'),
        utmCampaign: searchParams.get('utm_campaign'),
        utmTerm: searchParams.get('utm_term'),
        utmContent: searchParams.get('utm_content'),
      }
    });
    console.log('[Redirect] Event created:', { clickId, campaignId, variationId });
  } catch (eventError) {
    console.error('[Redirect] Failed to create event:', eventError);
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
