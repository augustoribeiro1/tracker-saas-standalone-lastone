import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import crypto from 'crypto';

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

  // Gerar webhook secret e token
  const webhookSecret = crypto.randomBytes(32).toString('hex');
  const webhookToken = crypto.randomBytes(16).toString('hex');
  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/${platform}/${webhookToken}`;

  const webhook = await db.webhookConfiguration.create({
    data: {
      userId: parseInt(session.user.id),
      campaignId: campaignId ? parseInt(campaignId) : null,
      platform,
      webhookUrl,
      webhookSecret,
      status: 'active'
    }
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
