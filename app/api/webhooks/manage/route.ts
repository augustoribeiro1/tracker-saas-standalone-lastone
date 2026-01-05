import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const webhooks = await db.webhookConfiguration.findMany({
    where: { userId: parseInt(session.user.id) },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ webhooks });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { platform, campaignId } = await request.json();
  const userId = parseInt(session.user.id);

  // ✅ BUSCAR OU GERAR TOKEN ÚNICO DO USUÁRIO
  let user = await db.user.findUnique({
    where: { id: userId },
    select: { webhookToken: true }
  });

  let webhookToken = user?.webhookToken;

  // Se usuário não tem token ainda, gerar um
  if (!webhookToken) {
    webhookToken = nanoid(32); // Token único de 32 caracteres
    await db.user.update({
      where: { id: userId },
      data: { webhookToken }
    });
    console.log('[Webhook] Generated new token for user:', userId);
  }

  // ✅ URL AGORA USA O TOKEN DO USUÁRIO (mesmo para todas as plataformas)
  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/${platform}/${webhookToken}`;

  const webhook = await db.webhookConfiguration.create({
    data: {
      userId,
      campaignId: campaignId ? parseInt(campaignId) : null,
      platform,
      webhookUrl,
      webhookSecret: null, // Não precisamos mais de secret
      status: 'active'
    }
  });

  console.log('[Webhook] Created webhook config:', {
    platform,
    userId,
    token: webhookToken
  });

  return NextResponse.json({ webhook });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const webhookId = searchParams.get('id');

  if (!webhookId) {
    return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 });
  }

  await db.webhookConfiguration.delete({
    where: {
      id: parseInt(webhookId),
      userId: parseInt(session.user.id)
    }
  });

  return NextResponse.json({ success: true });
}
