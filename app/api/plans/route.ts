import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const plans = await db.plan.findMany({
    where: { 
      active: true,
      name: {
        not: 'agency'  // Excluir plano Agency
      }
    },
    orderBy: { monthlyPrice: 'asc' }
  });

  return NextResponse.json({ plans });
}
