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

    // ✅ Determinar URL de destino das VARIATIONS (A/B test)
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

    // ✅ Selecionar variação (por enquanto, primeira disponível)
    // TODO: Implementar distribuição A/B test
    const variation = campaign.variations[0];
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

    // ✅ Garantir que URL é absoluta (NextResponse.redirect exige)
    if (!destinationUrl.startsWith('http://') && !destinationUrl.startsWith('https://')) {
      destinationUrl = 'https://' + destinationUrl;
    }

    console.log('[/r] Redirecting to:', destinationUrl, '(Variation:', variation.id + ')');

    // Fazer redirect
    return NextResponse.redirect(destinationUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
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
