'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, ExternalLink } from 'lucide-react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, campaignsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/campaigns')
      ]);

      const statsData = await statsRes.json();
      const campaignsData = await campaignsRes.json();

      setStats(statsData);
      setCampaigns(campaignsData.campaigns || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando dashboard...</div>
      </div>
    );
  }

  const currentPlan = session?.user?.plan || 'free';
  const planLimits = stats?.planLimits || {};
  const usage = stats?.usage || {};

  const campaignsUsage = planLimits.maxCampaigns > 0 
    ? (usage.campaigns / planLimits.maxCampaigns) * 100 
    : 0;
  const clicksUsage = planLimits.maxClicks > 0 
    ? (usage.clicks / planLimits.maxClicks) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {session?.user?.name || session?.user?.email}!
          </h1>
          <p className="mt-1 text-muted-foreground">
            Aqui está um resumo do seu dashboard
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/campaigns/new">
            <Button>Nova Campanha</Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm">
          Plano {currentPlan.toUpperCase()}
        </Badge>
        {currentPlan === 'free' && (
          <Link href="/pricing">
            <Button variant="outline" size="sm">Fazer Upgrade</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Views"
          value={stats?.summary?.totalClicks?.toLocaleString() || '0'}
          subtitle="Últimos 7 dias"
          trend={stats?.viewsTrend}
        />
        <StatsCard
          title="Conversão Secundária"
          value={stats?.summary?.totalCheckouts?.toLocaleString() || '0'}
          subtitle={`Taxa: ${stats?.summary?.checkoutRate?.toFixed(2) || '0'}%`}
          trend={stats?.conversionsTrend}
        />
        <StatsCard
          title="Compras"
          value={stats?.summary?.totalPurchases?.toLocaleString() || '0'}
          subtitle={`Taxa: ${stats?.summary?.purchaseRate?.toFixed(2) || '0'}%`}
          trend={stats?.purchasesTrend}
        />
        <StatsCard
          title="Receita Total"
          value={formatCurrency(stats?.summary?.totalRevenue || 0)}
          subtitle={`Ticket: ${formatCurrency(stats?.summary?.avgOrderValue || 0)}`}
          trend={stats?.revenueTrend}
        />
      </div>

      {(campaignsUsage > 80 || clicksUsage > 80) && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Atenção aos limites do plano
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                  {campaignsUsage > 80 && (
                    <li>Campanhas: {usage.campaigns}/{planLimits.maxCampaigns} ({campaignsUsage.toFixed(0)}%)</li>
                  )}
                  {clicksUsage > 80 && (
                    <li>Clicks: {usage.clicks?.toLocaleString()}/{planLimits.maxClicks?.toLocaleString()} ({clicksUsage.toFixed(0)}%)</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats?.timeline && stats.timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance - Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" name="Views" strokeWidth={2} />
                <Line type="monotone" dataKey="conversions" stroke="#10B981" name="Conversão Secundária" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Últimas Campanhas</CardTitle>
          <Link href="/campaigns" className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver todas
            <ExternalLink className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Você ainda não criou nenhuma campanha</p>
              <Link href="/campaigns/new">
                <Button>Criar Primeira Campanha</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Campanha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.slice(0, 5).map((campaign: any) => {
                    const fullUrl = campaign.customDomain
                      ? `https://${campaign.customDomain.domain}/r/${campaign.slug}`
                      : `/r/${campaign.slug}`;

                    return (
                      <tr key={campaign.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {campaign.variations?.length || 0} variações
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {fullUrl.length > 40 ? fullUrl.substring(0, 40) + '...' : fullUrl}
                          </code>
                        </td>
                        <td className="px-4 py-4 text-right text-sm">
                          <Link href={`/campaigns/${campaign.id}/edit`} className="text-primary hover:underline mr-3">
                            Editar
                          </Link>
                          <Link href={`/campaigns/${campaign.id}`} className="text-green-600 dark:text-green-400 hover:underline">
                            Analytics
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
