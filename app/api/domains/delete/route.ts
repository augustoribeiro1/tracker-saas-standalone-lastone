import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteCustomHostname } from '@/lib/cloudflare';

/**
 * DELETE /api/domains/delete?domainId=123
 * Remove um domínio customizado
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Pegar domainId da query string
    const searchParams = request.nextUrl.searchParams;
    const domainId = searchParams.get('domainId');

    if (!domainId) {
      return NextResponse.json(
        { error: 'domainId é obrigatório' },
        { status: 400 }
      );
    }

    // 3. Buscar domínio no banco
    const customDomain = await db.customDomain.findFirst({
      where: {
        id: parseInt(domainId),
        userId: parseInt(session.user.id), // Só pode deletar seus próprios domínios
      },
      include: {
        campaigns: true, // Verificar se tem campanhas usando este domínio
      },
    });

    if (!customDomain) {
      return NextResponse.json(
        { error: 'Domínio não encontrado' },
        { status: 404 }
      );
    }

    // 4. Verificar se tem campanhas ativas usando este domínio
    if (customDomain.campaigns.length > 0) {
      return NextResponse.json(
        {
          error: 'Não é possível deletar domínio com campanhas ativas',
          campaigns: customDomain.campaigns.length,
          suggestion: 'Delete ou mova as campanhas primeiro',
        },
        { status: 409 }
      );
    }

    console.log('[Delete Domain] Deleting:', customDomain.domain);

    // 5. Deletar do Cloudflare (se tiver hostname ID)
    if (customDomain.cloudflareHostnameId) {
      try {
        await deleteCustomHostname(customDomain.cloudflareHostnameId);
        console.log('[Delete Domain] Deleted from Cloudflare');
      } catch (cfError: any) {
        console.error('[Delete Domain] Error deleting from Cloudflare:', cfError);
        // Continua mesmo se falhar no Cloudflare
        // (domínio pode já ter sido deletado manualmente)
      }
    }

    // 6. Deletar do banco de dados
    await db.customDomain.delete({
      where: {
        id: customDomain.id,
      },
    });

    console.log('[Delete Domain] Deleted from database');

    return NextResponse.json({
      success: true,
      message: 'Domínio deletado com sucesso',
      domain: customDomain.domain,
    });

  } catch (error: any) {
    console.error('[Delete Domain] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Erro ao deletar domínio',
        details: error.message || 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/domains/delete
 * Alternativa usando POST com body (caso prefira)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Pegar dados do body
    const body = await request.json();
    const { domainId } = body;

    if (!domainId) {
      return NextResponse.json(
        { error: 'domainId é obrigatório' },
        { status: 400 }
      );
    }

    // 3. Buscar domínio no banco
    const customDomain = await db.customDomain.findFirst({
      where: {
        id: parseInt(domainId),
        userId: parseInt(session.user.id),
      },
      include: {
        campaigns: true,
      },
    });

    if (!customDomain) {
      return NextResponse.json(
        { error: 'Domínio não encontrado' },
        { status: 404 }
      );
    }

    // 4. Verificar campanhas
    if (customDomain.campaigns.length > 0) {
      return NextResponse.json(
        {
          error: 'Não é possível deletar domínio com campanhas ativas',
          campaigns: customDomain.campaigns.length,
        },
        { status: 409 }
      );
    }

    // 5. Deletar do Cloudflare
    if (customDomain.cloudflareHostnameId) {
      try {
        await deleteCustomHostname(customDomain.cloudflareHostnameId);
      } catch (cfError: any) {
        console.error('[Delete Domain POST] Cloudflare error:', cfError);
      }
    }

    // 6. Deletar do banco
    await db.customDomain.delete({
      where: {
        id: customDomain.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Domínio deletado com sucesso',
      domain: customDomain.domain,
    });

  } catch (error: any) {
    console.error('[Delete Domain POST] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Erro ao deletar domínio',
        details: error.message || 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
