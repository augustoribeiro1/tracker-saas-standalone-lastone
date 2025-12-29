import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Verificar se user é admin (pode melhorar com campo isAdmin na tabela)
async function isAdmin(userId: number) {
  const user = await db.user.findUnique({ where: { id: userId } });
  // Por enquanto, admin é quem tem plan 'agency' ou o primeiro usuário
  return user?.id === 1 || user?.plan === 'agency';
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  if (!await isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      status: true,
      createdAt: true,
      stripeCustomerId: true,
      _count: {
        select: {
          campaigns: true,
          webhookConfigs: true,
          customDomains: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  if (!await isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId: targetUserId, plan, status } = await request.json();

  const updateData: any = {};

  if (plan) {
    // Buscar limites do novo plano
    const planData = await db.plan.findUnique({ where: { name: plan } });
    
    if (planData) {
      updateData.plan = plan;
      updateData.maxCampaigns = planData.maxCampaigns;
      updateData.maxVariations = planData.maxVariations;
      updateData.maxClicks = planData.maxClicks;
      updateData.maxDomains = planData.maxDomains;
    }
  }

  if (status) {
    updateData.status = status;
  }

  const updatedUser = await db.user.update({
    where: { id: targetUserId },
    data: updateData
  });

  return NextResponse.json({ user: updatedUser });
}
