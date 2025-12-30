import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const domains = await db.customDomain.findMany({
    where: { userId: parseInt(session.user.id) },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ domains });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { domain } = await request.json();

  // Validar formato do domínio
  if (!domain || !domain.match(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  const existing = await db.customDomain.findUnique({ where: { domain } });
  if (existing) {
    return NextResponse.json({ error: 'Domain already registered' }, { status: 400 });
  }

  try {
    // 1. Adicionar domínio ao Vercel AUTOMATICAMENTE via API
    const { addDomainToVercel } = await import('@/lib/vercel');
    
    console.log(`[Domains API] Adicionando domínio ${domain} ao Vercel...`);
    
    const vercelResult = await addDomainToVercel(domain);
    
    console.log(`[Domains API] Domínio ${domain} adicionado ao Vercel:`, JSON.stringify(vercelResult, null, 2));

    // Extrair o DNS target correto da resposta
    // A Vercel retorna: { success: true, domain: { name, verification: [...] } }
    let vercelDnsTarget = 'cname.vercel-dns.com'; // Fallback
    
    if (vercelResult.domain) {
      console.log('[Domains API] Estrutura do domain:', JSON.stringify(vercelResult.domain, null, 2));
      
      // Tentar acessar verification
      if (vercelResult.domain.verification && Array.isArray(vercelResult.domain.verification)) {
        const cnameRecord = vercelResult.domain.verification.find((v: any) => v.type === 'CNAME');
        if (cnameRecord && cnameRecord.value) {
          vercelDnsTarget = cnameRecord.value;
          console.log('[Domains API] DNS target extraído:', vercelDnsTarget);
        } else {
          console.log('[Domains API] CNAME record não encontrado no verification');
        }
      } else {
        console.log('[Domains API] verification não existe ou não é array');
      }
    }

    // 2. Salvar no banco
    const newDomain = await db.customDomain.create({
      data: {
        userId: parseInt(session.user.id),
        domain,
        status: 'verifying',
        vercelConfigured: true,
        vercelDnsTarget: vercelDnsTarget
      }
    });

    return NextResponse.json({ 
      domain: newDomain,
      message: 'Domínio adicionado ao Vercel automaticamente!',
      dnsTarget: vercelDnsTarget,
      debug: {
        vercelResponse: vercelResult
      }
    });

  } catch (error: any) {
    console.error('[Domains API] Erro ao adicionar domínio:', error);
    
    // Tentar buscar DNS via checkDomainStatus se o domínio já existe
    let vercelDnsTarget = 'cname.vercel-dns.com';
    
    try {
      const { checkDomainStatus } = await import('@/lib/vercel');
      const status = await checkDomainStatus(domain);
      
      console.log('[Domains API] Status do domínio:', JSON.stringify(status, null, 2));
      
      if (status.exists && status.verification && Array.isArray(status.verification)) {
        const cnameRecord = status.verification.find((v: any) => v.type === 'CNAME');
        if (cnameRecord && cnameRecord.value) {
          vercelDnsTarget = cnameRecord.value;
          console.log('[Domains API] DNS obtido via checkDomainStatus:', vercelDnsTarget);
        }
      }
    } catch (statusError) {
      console.error('[Domains API] Erro ao buscar status:', statusError);
    }
    
    // Salvar no banco mesmo se Vercel falhar
    const newDomain = await db.customDomain.create({
      data: {
        userId: parseInt(session.user.id),
        domain,
        status: 'pending',
        vercelConfigured: false,
        vercelDnsTarget: vercelDnsTarget
      }
    });

    return NextResponse.json({ 
      domain: newDomain,
      warning: 'Domínio salvo, mas erro ao adicionar no Vercel.',
      error: error.message,
      dnsTarget: vercelDnsTarget
    }, { status: 207 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const domainId = searchParams.get('id');

  // Buscar domínio antes de deletar
  const domain = await db.customDomain.findFirst({
    where: {
      id: parseInt(domainId!),
      userId: parseInt(session.user.id)
    }
  });

  if (!domain) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
  }

  try {
    // 1. Remover do Vercel AUTOMATICAMENTE
    const { removeDomainFromVercel } = await import('@/lib/vercel');
    
    console.log(`[Domains API] Removendo domínio ${domain.domain} do Vercel...`);
    
    await removeDomainFromVercel(domain.domain);
    
    console.log(`[Domains API] Domínio ${domain.domain} removido do Vercel`);

  } catch (error: any) {
    console.error('[Domains API] Erro ao remover do Vercel:', error);
    // Continua e deleta do banco mesmo se Vercel falhar
  }

  // 2. Deletar do banco
  await db.customDomain.delete({
    where: {
      id: parseInt(domainId!),
      userId: parseInt(session.user.id)
    }
  });

  return NextResponse.json({ success: true });
}
