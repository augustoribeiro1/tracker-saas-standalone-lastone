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

    // ✅ URL de checkout das variations
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

    // Selecionar variation (primeira disponível)
    const variation = campaign.variations[0];
    
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

    console.log('[/c] Redirecting to checkout:', checkoutUrl, '(Variation:', variation.id + ')');

    // Redirect para checkout
    return NextResponse.redirect(checkoutUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
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
