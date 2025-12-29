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

  const existing = await db.customDomain.findUnique({ where: { domain } });
  if (existing) {
    return NextResponse.json({ error: 'Domain already registered' }, { status: 400 });
  }

  const newDomain = await db.customDomain.create({
    data: {
      userId: parseInt(session.user.id),
      domain,
      status: 'pending'
    }
  });

  return NextResponse.json({ domain: newDomain });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const domainId = searchParams.get('id');

  await db.customDomain.delete({
    where: {
      id: parseInt(domainId!),
      userId: parseInt(session.user.id)
    }
  });

  return NextResponse.json({ success: true });
}
