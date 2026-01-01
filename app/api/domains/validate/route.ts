import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * VALIDAR DOMÍNIO - Usado pelo Cloudflare Worker
 * 
 * POST /api/domains/validate
 * Body: { domain: "track.cliente.com" }
 * 
 * Retorna:
 * - 200: Domínio válido e ativo
 * - 404: Domínio não encontrado ou inativo
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Buscar domínio no banco
    const customDomain = await db.customDomain.findFirst({
      where: {
        domain: domain.toLowerCase().trim(),
        status: 'active',
        dnsConfigured: true,
      },
      select: {
        id: true,
        domain: true,
        status: true,
        dnsConfigured: true,
      }
    });

    if (!customDomain) {
      console.log('[Domain Validation] Not found or inactive:', domain);
      return NextResponse.json(
        { error: 'Domain not found or inactive', valid: false },
        { status: 404 }
      );
    }

    console.log('[Domain Validation] Valid:', domain);

    return NextResponse.json({
      valid: true,
      domain: customDomain.domain,
      status: customDomain.status,
    });

  } catch (error: any) {
    console.error('[Domain Validation] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', valid: false },
      { status: 500 }
    );
  }
}

// GET também funciona (para testes)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const domain = url.searchParams.get('domain');

  if (!domain) {
    return NextResponse.json(
      { error: 'Domain parameter required' },
      { status: 400 }
    );
  }

  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ domain })
    })
  );
}
