import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/campaigns - Listar campanhas do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const campaigns = await db.campaign.findMany({
      where: { userId: user.id },
      include: {
        variations: {
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error('Erro ao listar campanhas:', error);
    return NextResponse.json(
      { error: 'Erro ao listar campanhas', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Criar nova campanha
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, variations } = body;

    // Validações
    if (!name || !slug || !variations || variations.length < 2) {
      return NextResponse.json(
        { error: 'Nome, slug e pelo menos 2 variações são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se slug já existe
    const existing = await db.campaign.findFirst({
      where: { slug, userId: user.id }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma campanha com este slug' },
        { status: 400 }
      );
    }

    // Criar campanha
    const campaign = await db.campaign.create({
      data: {
        name,
        slug: slug.toLowerCase(),
        userId: user.id,
        status: 'active',
        variations: {
          create: variations.map((v: any) => ({
            name: v.name,
            destinationUrl: v.destinationUrl,
            weight: v.weight || 50,
            isControl: v.isControl || false
          }))
        }
      },
      include: {
        variations: true
      }
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar campanha:', error);
    return NextResponse.json(
      { error: 'Erro ao criar campanha', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns?id=X - Deletar campanha
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');

    if (!campaignId) {
      return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se campanha pertence ao usuário
    const campaign = await db.campaign.findFirst({
      where: {
        id: parseInt(campaignId),
        userId: user.id
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    // Deletar campanha (cascade deleta variações)
    await db.campaign.delete({
      where: { id: parseInt(campaignId) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar campanha:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar campanha', details: error.message },
      { status: 500 }
    );
  }
}
