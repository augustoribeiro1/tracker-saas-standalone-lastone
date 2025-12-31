import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const searchParams = request.nextUrl.searchParams;
  const requestHost = request.headers.get('host') || '';
  
  try {
    // 1. Buscar campanha pelo slug E domínio
    let campaign = await db.campaign.findFirst({
      where: { 
        slug,
        status: 'active',
        enableSecondaryConversion: true,
        customDomain: {
          domain: requestHost
        }
      },
      include: { 
        customDomain: true
      }
    });
    
    // Se não encontrou com domínio customizado, buscar sem domínio
    if (!campaign) {
      campaign = await db.campaign.findFirst({
        where: { 
          slug,
          status: 'active',
          enableSecondaryConversion: true,
          customDomain: null
        },
        include: { 
          customDomain: true
        }
      });
    }
    
    if (!campaign) {
      return new NextResponse('Conversion tracking not found or not enabled', { status: 404 });
    }
    
    if (!campaign.checkoutUrl) {
      return new NextResponse('Checkout URL not configured', { status: 404 });
    }
    
    console.log('[Conversion] Campaign found:', { 
      slug, 
      campaignId: campaign.id,
      checkoutUrl: campaign.checkoutUrl
    });
    
    // 2. Verificar utm_term existente (visitante retornando)
    const existingUtmTerm = searchParams.get('utm_term');
    let clickId: string;
    let variationId: number | null = null;
    
    if (existingUtmTerm) {
      // Visitante retornando - buscar variação original
      clickId = existingUtmTerm;
      
      const originalEvent = await db.event.findFirst({
        where: {
          clickId,
          campaignId: campaign.id,
          eventType: 'view'
        },
        select: { variationId: true }
      });
      
      if (originalEvent) {
        variationId = originalEvent.variationId;
        console.log('[Conversion] Returning visitor:', { clickId, variationId });
      }
    } else {
      // Novo visitante sem tracking - criar clickId
      clickId = nanoid(21);
      console.log('[Conversion] New visitor without tracking:', { clickId });
    }
    
    // Se não encontrou variationId, pegar primeira variação da campanha
    if (!variationId) {
      const firstVariation = await db.variation.findFirst({
        where: { campaignId: campaign.id },
        select: { id: true }
      });
      
      if (firstVariation) {
        variationId = firstVariation.id;
        console.log('[Conversion] No original variation found, using first:', { variationId });
      }
    }
    
    // 3. Registrar evento de conversão secundária
    if (variationId) {
      try {
        await db.event.create({
          data: {
            clickId,
            campaignId: campaign.id,
            variationId,
            eventType: 'conversion',
            eventName: 'checkout_click',
            userAgent: request.headers.get('user-agent'),
            referer: request.headers.get('referer'),
            utmSource: searchParams.get('utm_source'),
            utmMedium: searchParams.get('utm_medium'),
            utmCampaign: searchParams.get('utm_campaign'),
            utmTerm: clickId,
            utmContent: searchParams.get('utm_content'),
          }
        });
        
        console.log('[Conversion] Secondary conversion registered:', { 
          clickId, 
          variationId,
          campaignId: campaign.id
        });
      } catch (error) {
        console.error('[Conversion] Error registering event:', error);
        // Continua mesmo com erro - não quebra o redirect
      }
    } else {
      console.warn('[Conversion] Could not find variation for campaign:', {
        campaignId: campaign.id,
        clickId
      });
    }
    
    // 4. Construir URL de redirect
    const checkoutUrl = new URL(campaign.checkoutUrl);
    
    // Preservar parâmetros UTM
    const utmParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 
      'utm_content', 'utm_term'
    ];
    
    utmParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        checkoutUrl.searchParams.set(param, value);
      }
    });
    
    // Garantir que utm_term está presente
    if (!checkoutUrl.searchParams.has('utm_term')) {
      checkoutUrl.searchParams.set('utm_term', clickId);
    }
    
    console.log('[Conversion] Redirecting to:', checkoutUrl.toString());
    
    // 5. Redirect
    return NextResponse.redirect(checkoutUrl.toString(), { status: 302 });
    
  } catch (error) {
    console.error('[Conversion] Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
