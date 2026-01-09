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

    console.log('[/c] Request host:', request.headers.get('host'), 'Forwarded:', customDomain);
    
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
      console.log('[/c] Campaign not found:', slug);
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
        console.log('[/c] Invalid custom domain:', {
          customDomain,
          campaignId: campaign.id,
          userId: campaign.userId
        });
        
        return NextResponse.json(
          { error: 'Campaign not found or inactive' },
          { status: 404 }
        );
      }

      console.log('[/c] Valid custom domain:', customDomain);
    }

    // ✅ Selecionar variation baseada em distribuição A/B
    if (!campaign.variations || campaign.variations.length === 0) {
      console.log('[/c] No variations configured:', campaign.id);
      return NextResponse.json(
        { 
          error: 'Campaign variations not configured',
          campaignId: campaign.id 
        },
        { status: 404 }
      );
    }

    // ✅ DISTRIBUIÇÃO A/B baseada em peso
    const variation = selectVariation(campaign.variations);
    
    // Tentar checkoutUrl primeiro, senão destinationUrl
    let checkoutUrl = (variation as any).checkoutUrl || variation.destinationUrl;

    if (!checkoutUrl) {
      console.log('[/c] No checkout URL configured:', variation.id);
      return NextResponse.json(
        { 
          error: 'Checkout not configured',
          campaignId: campaign.id,
          variationId: variation.id
        },
        { status: 404 }
      );
    }

    // ✅ Garantir que URL é absoluta
    if (!checkoutUrl.startsWith('http://') && !checkoutUrl.startsWith('https://')) {
      checkoutUrl = 'https://' + checkoutUrl;
    }

    // ✅ Repassar todos os parâmetros UTM e query parameters da URL original
    const checkoutUrlObj = new URL(checkoutUrl);
    const originalParams = request.nextUrl.searchParams;

    // Adicionar todos os parâmetros da URL original à URL de destino
    originalParams.forEach((value, key) => {
      // Preservar parâmetros existentes na URL de destino, mas adicionar novos
      if (!checkoutUrlObj.searchParams.has(key)) {
        checkoutUrlObj.searchParams.set(key, value);
      }
    });

    const finalCheckoutUrl = checkoutUrlObj.toString();

    console.log('[/c] Selected variation:', variation.id, 'Traffic:', variation.trafficPercentage + '%');
    console.log('[/c] Original URL params:', Object.fromEntries(originalParams.entries()));
    console.log('[/c] Redirecting to checkout:', finalCheckoutUrl);

    // ✅ REGISTRAR ANALYTICS (Conversion)
    try {
      await db.$executeRaw`
        INSERT INTO Conversion (campaignId, variationId, domain, userAgent, referer, createdAt)
        VALUES (${campaign.id}, ${variation.id}, ${customDomain || 'app.split2.com.br'}, 
                ${request.headers.get('user-agent') || ''}, 
                ${request.headers.get('referer') || null}, 
                ${new Date()})
      `;
      console.log('[/c] Analytics recorded: Conversion for variation', variation.id);
    } catch (analyticsError) {
      console.error('[/c] Analytics error:', analyticsError);
      // Não falhar o redirect
    }

    // Redirect para checkout com todos os parâmetros
    return NextResponse.redirect(finalCheckoutUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Split2-Variation': variation.id.toString()
      }
    });

  } catch (error) {
    console.error('[/c] Error:', error);
    
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
