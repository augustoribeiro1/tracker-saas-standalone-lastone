import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { promises as dns } from 'dns';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const domainId = parseInt(params.id);

  try {
    const domain = await db.customDomain.findFirst({
      where: {
        id: domainId,
        userId: parseInt(session.user.id)
      }
    });

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Verificar CNAME
    let dnsConfigured = false;
    let expectedTarget = 'cname.vercel-dns.com';

    try {
      const records = await dns.resolveCname(domain.domain);
      
      // Verificar se algum registro aponta para o target esperado
      dnsConfigured = records.some(record => 
        record.toLowerCase().includes('vercel') || 
        record === expectedTarget
      );

      console.log('DNS records found:', records);
    } catch (error: any) {
      console.error('DNS lookup failed:', error.code);
      
      // ENOTFOUND significa que o domínio não existe ou não tem CNAME
      if (error.code !== 'ENOTFOUND' && error.code !== 'ENODATA') {
        throw error;
      }
    }

    // Atualizar domínio no banco
    const updatedDomain = await db.customDomain.update({
      where: { id: domainId },
      data: {
        dnsConfigured,
        dnsVerifiedAt: dnsConfigured ? new Date() : null,
        status: dnsConfigured ? 'active' : 'pending',  // ← MUDADO: active quando DNS OK
        lastCheckedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: dnsConfigured,
      domain: updatedDomain,
      message: dnsConfigured 
        ? 'DNS configurado corretamente! Domínio ativo.'
        : 'DNS ainda não configurado. Aguarde alguns minutos após configurar e tente novamente.'
    });

  } catch (error: any) {
    console.error('Error verifying DNS:', error);
    return NextResponse.json(
      { error: 'Error verifying DNS', details: error.message },
      { status: 500 }
    );
  }
}
