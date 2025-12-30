import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkDomainStatus } from '@/lib/vercel';

// GET /api/domains/fix-dns - Corrigir domínios antigos sem vercelDnsTarget
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Buscar domínios do usuário sem vercelDnsTarget
    const domains = await db.customDomain.findMany({
      where: {
        userId: parseInt(session.user.id),
        OR: [
          { vercelDnsTarget: null },
          { vercelDnsTarget: 'cname.vercel-dns.com' } // Valor genérico antigo
        ]
      }
    });

    if (domains.length === 0) {
      return NextResponse.json({ 
        message: 'Nenhum domínio precisa ser corrigido',
        updated: 0 
      });
    }

    const results = [];

    // Para cada domínio, buscar o DNS target correto da Vercel API
    for (const domain of domains) {
      try {
        const status = await checkDomainStatus(domain.domain);
        
        if (status.exists && status.verification) {
          // Pegar o primeiro registro CNAME do verification
          const cnameRecord = status.verification.find((v: any) => v.type === 'CNAME');
          
          if (cnameRecord) {
            // Atualizar no banco
            await db.customDomain.update({
              where: { id: domain.id },
              data: {
                vercelDnsTarget: cnameRecord.value
              }
            });

            results.push({
              domain: domain.domain,
              updated: true,
              newTarget: cnameRecord.value
            });
          } else {
            results.push({
              domain: domain.domain,
              updated: false,
              error: 'CNAME record not found in Vercel'
            });
          }
        } else {
          results.push({
            domain: domain.domain,
            updated: false,
            error: 'Domain not found in Vercel'
          });
        }
      } catch (error: any) {
        results.push({
          domain: domain.domain,
          updated: false,
          error: error.message
        });
      }
    }

    const updated = results.filter(r => r.updated).length;

    return NextResponse.json({
      message: `${updated} domínio(s) atualizado(s)`,
      updated,
      total: domains.length,
      results
    });

  } catch (error: any) {
    console.error('[Fix DNS] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao corrigir domínios', details: error.message },
      { status: 500 }
    );
  }
}
