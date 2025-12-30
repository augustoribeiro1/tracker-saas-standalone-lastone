import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Função de seleção (mesma do redirect)
function selectVariation(variations: any[]) {
  const totalWeight = variations.reduce((sum: number, v: any) => sum + v.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  
  for (const variation of variations) {
    cumulative += variation.weight;
    if (random <= cumulative) return variation;
  }
  
  return variations[0];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const searchParams = request.nextUrl.searchParams;
  const iterations = parseInt(searchParams.get('iterations') || '1000');

  try {
    // Buscar campanha
    const campaign = await db.campaign.findFirst({
      where: { slug },
      include: { variations: true }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Simular N visitantes
    const results: { [key: string]: number } = {};
    
    for (let i = 0; i < iterations; i++) {
      const selected = selectVariation(campaign.variations);
      const key = selected.name;
      results[key] = (results[key] || 0) + 1;
    }

    // Calcular porcentagens
    const distribution = Object.entries(results).map(([name, count]) => ({
      variation: name,
      count,
      percentage: ((count / iterations) * 100).toFixed(2) + '%',
      expectedPercentage: campaign.variations.find((v: any) => v.name === name)?.weight + '%'
    }));

    return NextResponse.json({
      campaign: campaign.name,
      slug: campaign.slug,
      iterations,
      distribution,
      summary: {
        totalIterations: iterations,
        expectedDistribution: campaign.variations.map((v: any) => ({
          name: v.name,
          weight: v.weight + '%'
        })),
        actualDistribution: distribution.map(d => ({
          name: d.variation,
          percentage: d.percentage
        }))
      }
    });

  } catch (error: any) {
    console.error('[Test Distribution Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
