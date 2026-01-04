import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    // ✅ CRÍTICO: Obter hostname do custom domain via headers
    const customDomain = 
      request.headers.get('x-forwarded-host') ||
      request.headers.get('x-custom-domain') ||
      request.headers.get('x-original-host') ||
      request.headers.get('host');

    console.log('[/r] Request host:', request.headers.get('host'), 'Forwarded:', customDomain);
    
    // Buscar campanha pelo slug
    const campaign = await db.campaign.findFirst({
      where: {
        slug,
        status: 'active'
      },
      include: {
        user: {
          include: {
            customDomains: true
          }
        },
        variations: true  // ✅ INCLUIR VARIATIONS!
      }
    });

    if (!campaign) {
      console.log('[/r] Campaign not found:', slug);
      return NextResponse.json(
        { error: 'Campaign not found or inactive' },
        { status: 404 }
      );
    }

    // ✅ CORREÇÃO: Se custom domain, validar se pertence ao usuário
    if (customDomain && customDomain !== 'app.split2.com.br') {
      const isValidDomain = campaign.user.customDomains.some(
        d => d.domain === customDomain && d.status === 'active'
      );

      if (!isValidDomain) {
        console.log('[/r] Invalid custom domain:', {
          customDomain,
          campaignId: campaign.id,
          userId: campaign.userId,
          availableDomains: campaign.user.customDomains.map(d => d.domain)
        });
        
        return NextResponse.json(
          { error: 'Campaign not found or inactive' },
          { status: 404 }
        );
      }

      console.log('[/r] Valid custom domain:', customDomain);
    }

    // ✅ Determinar variation baseada em distribuição A/B
    if (!campaign.variations || campaign.variations.length === 0) {
      console.log('[/r] No variations configured for campaign:', campaign.id);
      return NextResponse.json(
        { 
          error: 'Campaign variations not configured',
          campaignId: campaign.id,
          slug: campaign.slug
        },
        { status: 404 }
      );
    }

    // ✅ DISTRIBUIÇÃO A/B baseada em peso/proporção
    const variation = selectVariation(campaign.variations);
    let destinationUrl = variation.destinationUrl;

    // ✅ Verificar se variation tem URL
    if (!destinationUrl) {
      console.log('[/r] Variation has no destination URL:', variation.id);
      return NextResponse.json(
        { 
          error: 'Variation destination not configured',
          campaignId: campaign.id,
          variationId: variation.id
        },
        { status: 404 }
      );
    }

    // ✅ Garantir que URL é absoluta
    if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
      destinationUrl = 'https://' + destinationUrl;
    }

    console.log('[/r] Selected variation:', variation.id, 'Traffic:', variation.trafficPercentage + '%');
    console.log('[/r] Redirecting to:', destinationUrl);

    // ✅ REGISTRAR ANALYTICS (Click/View)
    try {
      await db.$executeRaw`
        INSERT INTO Click (campaignId, variationId, domain, userAgent, referer, createdAt)
        VALUES (${campaign.id}, ${variation.id}, ${customDomain || 'app.split2.com.br'}, 
                ${request.headers.get('user-agent') || ''}, 
                ${request.headers.get('referer') || null}, 
                ${new Date()})
      `;
      console.log('[/r] Analytics recorded: Click for variation', variation.id);
    } catch (analyticsError) {
      console.error('[/r] Analytics error:', analyticsError);
      // Não falhar o redirect por erro de analytics
    }

    // Fazer redirect
    return NextResponse.redirect(destinationUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Split2-Variation': variation.id.toString() // Header para tracking
      }
    });

  } catch (error) {
    console.error('[/r] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Selecionar variation baseada em distribuição de tráfego
 */
function selectVariation(variations: any[]): any {
  // Se só tem 1 variation, retornar ela
  if (variations.length === 1) {
    return variations[0];
  }

  // ✅ Distribuição baseada em trafficPercentage (ou weight)
  const totalPercentage = variations.reduce((sum, v) => {
    return sum + (v.trafficPercentage || v.weight || 0);
  }, 0);

  // Se nenhuma tem percentage/weight, distribuir igualmente
  if (totalPercentage === 0) {
    const randomIndex = Math.floor(Math.random() * variations.length);
    return variations[randomIndex];
  }

  // Selecionar baseado em peso acumulativo
  const random = Math.random() * totalPercentage;
  let cumulative = 0;

  for (const variation of variations) {
    cumulative += (variation.trafficPercentage || variation.weight || 0);
    if (random <= cumulative) {
      return variation;
    }
  }

  // Fallback: retornar última
  return variations[variations.length - 1];
}
