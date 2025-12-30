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
    
    console.log(`[Domains API] Domínio ${domain} adicionado ao Vercel:`, vercelResult);

    // Extrair o DNS target correto da resposta
    const vercelDnsTarget = vercelResult.domain?.verification?.[0]?.value || 'cname.vercel-dns.com';

    // 2. Salvar no banco
    const newDomain = await db.customDomain.create({
      data: {
        userId: parseInt(session.user.id),
        domain,
        status: 'verifying', // Vercel vai verificar DNS automaticamente
        vercelConfigured: true,
        vercelDnsTarget: vercelDnsTarget // Salvar o valor correto!
      }
    });

    return NextResponse.json({ 
      domain: newDomain,
      message: 'Domínio adicionado ao Vercel automaticamente! Configure o DNS e aguarde verificação.',
      dnsTarget: vercelDnsTarget
    });

  } catch (error: any) {
    console.error('[Domains API] Erro ao adicionar domínio:', error);
    
    // Salvar no banco mesmo se Vercel falhar (usuário pode configurar manualmente depois)
    const newDomain = await db.customDomain.create({
      data: {
        userId: parseInt(session.user.id),
        domain,
        status: 'pending',
        vercelConfigured: false,
        vercelDnsTarget: 'cname.vercel-dns.com' // Fallback
      }
    });

    return NextResponse.json({ 
      domain: newDomain,
      warning: 'Domínio salvo, mas erro ao adicionar no Vercel. Configure manualmente ou tente novamente.',
      error: error.message
    }, { status: 207 }); // 207 Multi-Status = parcialmente OK
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
