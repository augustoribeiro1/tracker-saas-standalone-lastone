import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * API /api/track/conversion
 * Registra conversão no banco
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, domain, clickid } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug' },
        { status: 400 }
      );
    }

    const customDomain = domain || request.headers.get('host');

    console.log('[/api/track/conversion] Slug:', slug, 'Clickid:', clickid);

    // Buscar campanha com variations
    const campaign = await db.campaign.findFirst({
      where: {
        slug,
        status: 'active'
      },
      include: {
        variations: true
      }
    });

    if (!campaign) {
      console.log('[/api/track/conversion] Campaign not found:', slug);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!campaign.variations || campaign.variations.length === 0) {
      console.log('[/api/track/conversion] No variations:', campaign.id);
      return NextResponse.json(
        { error: 'No variations configured' },
        { status: 404 }
      );
    }

    // ✅ BUSCAR CLICK ORIGINAL (se tiver clickid)
    let variationId = campaign.variations[0].id;

    if (clickid) {
      try {
        const originalClick = await db.click.findFirst({
          where: {
            clickid: clickid,
            campaignId: campaign.id
          }
        });

        if (originalClick) {
          variationId = originalClick.variationId;
          console.log('[/api/track/conversion] Found original click! Variation:', variationId);
        } else {
          console.log('[/api/track/conversion] Click not found for clickid:', clickid);
        }
      } catch (clickError) {
		const errorMessage = clickError instanceof Error ? clickError.message : String(clickError);
		console.log('[/api/track/conversion] Error finding click:', errorMessage);
		}
    }

    const variation = campaign.variations.find(v => v.id === variationId) || campaign.variations[0];

    // ✅ URL de checkout
    let checkoutUrl = (variation as any).checkoutUrl || variation.destinationUrl;

    if (!checkoutUrl) {
      console.log('[/api/track/conversion] No checkout URL:', variation.id);
      return NextResponse.json(
        { error: 'Checkout not configured' },
        { status: 404 }
      );
    }

    // Garantir URL absoluta
    if (!checkoutUrl.startsWith('http://') && !checkoutUrl.startsWith('https://')) {
      checkoutUrl = 'https://' + checkoutUrl;
    }

    console.log('[/api/track/conversion] Checkout URL:', checkoutUrl);

    // ✅ REGISTRAR CONVERSÃO
    try {
      await db.conversion.create({
        data: {
          campaignId: campaign.id,
          variationId: variationId,
          domain: customDomain || 'app.split2.com.br',
          userAgent: request.headers.get('user-agent') || '',
          referer: request.headers.get('referer') || null,
          clickid: clickid || null
        }
      });

      console.log('[/api/track/conversion] Conversion recorded! Campaign:', campaign.id, 'Variation:', variationId);
    } catch (dbError) {
      console.error('[/api/track/conversion] Database error:', dbError);
      // Não falhar se analytics der erro
    }

    // ✅ RETORNAR URL DE CHECKOUT
    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutUrl,
      variationId: variationId
    });

  } catch (error) {
    console.error('[/api/track/conversion] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
