import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

/**
 * API /api/track/click
 * Registra click + seleciona variation + gera clickid
 * Chamada pelo Worker ANTES de fazer proxy
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, domain } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug' },
        { status: 400 }
      );
    }

    const customDomain = domain || request.headers.get('host');

    console.log('[/api/track/click] Slug:', slug, 'Domain:', customDomain);

    // Buscar campanha com variations
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
        variations: true
      }
    });

    if (!campaign) {
      console.log('[/api/track/click] Campaign not found:', slug);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Validar custom domain
    if (customDomain && customDomain !== 'app.split2.com.br') {
      const isValidDomain = campaign.user.customDomains.some(
        d => d.domain === customDomain && d.status === 'active'
      );

      if (!isValidDomain) {
        console.log('[/api/track/click] Invalid domain:', customDomain);
        return NextResponse.json(
          { error: 'Invalid custom domain' },
          { status: 403 }
        );
      }
    }

    // Verificar variations
    if (!campaign.variations || campaign.variations.length === 0) {
      console.log('[/api/track/click] No variations:', campaign.id);
      return NextResponse.json(
        { error: 'No variations configured' },
        { status: 404 }
      );
    }

    // ✅ SELECIONAR VARIATION (A/B TEST)
    const variation = selectVariation(campaign.variations);

    if (!variation.destinationUrl) {
      console.log('[/api/track/click] No destination URL:', variation.id);
      return NextResponse.json(
        { error: 'Variation has no destination URL' },
        { status: 404 }
      );
    }

    // ✅ GERAR CLICKID ÚNICO
    const clickid = nanoid(20);

    console.log('[/api/track/click] Selected variation:', variation.id, 'Traffic:', (variation.trafficPercentage || 'undefined') + '%', 'Clickid:', clickid);

    // ✅ REGISTRAR ANALYTICS
    try {
      await db.click.create({
        data: {
          campaignId: campaign.id,
          variationId: variation.id,
          domain: customDomain || 'app.split2.com.br',
          userAgent: request.headers.get('user-agent') || '',
          referer: request.headers.get('referer') || null,
          clickid: clickid
        }
      });

      console.log('[/api/track/click] Analytics recorded! Campaign:', campaign.id, 'Variation:', variation.id, 'Clickid:', clickid);
    } catch (dbError) {
      console.error('[/api/track/click] Database error:', dbError);
      // Não falhar se analytics der erro
    }

    // ✅ RETORNAR DADOS
    return NextResponse.json({
      success: true,
      variation: {
        id: variation.id,
        name: variation.name,
        destinationUrl: variation.destinationUrl,
        trafficPercentage: variation.trafficPercentage
      },
      clickid: clickid,
      campaignId: campaign.id
    });

  } catch (error) {
    console.error('[/api/track/click] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Selecionar variation baseada em distribuição
 */
function selectVariation(variations: any[]): any {
  if (variations.length === 1) {
    return variations[0];
  }

  // Distribuição baseada em trafficPercentage
  const totalPercentage = variations.reduce((sum, v) => {
    return sum + (v.trafficPercentage || v.weight || 0);
  }, 0);

  // Se nenhuma tem percentage, distribuir igualmente
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

  return variations[variations.length - 1];
}
