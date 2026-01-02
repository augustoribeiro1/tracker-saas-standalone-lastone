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
        }
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

    // ✅ Determinar URL de destino (usar campos que existem no schema)
    // Assumindo que Campaign tem campo 'url' ou similar
    // Ajustar conforme seu schema real
    const destinationUrl = (campaign as any).url || 
                          (campaign as any).targetUrl || 
                          (campaign as any).destinationUrl ||
                          '/';

    console.log('[/r] Redirecting to:', destinationUrl);

    // Analytics (opcional - pode falhar sem quebrar)
    try {
      await db.analytics.create({
        data: {
          campaignId: campaign.id,
          eventType: 'click',
          domain: customDomain || 'app.split2.com.br',
          path: `/r/${slug}`,
          userAgent: request.headers.get('user-agent') || '',
          referer: request.headers.get('referer') || null
        }
      });
    } catch (analyticsError) {
      console.error('[/r] Analytics error:', analyticsError);
      // Não falhar se analytics não funcionar
    }

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
