'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

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
        <div className="text-lg text-gray-500">Carregando dashboard...</div>
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
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Olá, {session?.user?.name || session?.user?.email}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Aqui está um resumo do seu dashboard
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <Link href="/campaigns/new">
            <Button>Nova Campanha</Button>
          </Link>
          <Link href="/webhooks">
            <Button variant="outline">Adicionar Webhook</Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          Plano {currentPlan.toUpperCase()}
        </span>
        {currentPlan === 'free' && (
          <Link href="/pricing">
            <Button variant="outline" size="sm">Fazer Upgrade</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Views"
          value={stats?.totalViews?.toLocaleString() || '0'}
          subtitle="Últimos 7 dias"
          trend={stats?.viewsTrend}
        />
        <StatsCard
          title="Conversão Secundária"
          value={stats?.totalConversions?.toLocaleString() || '0'}
          subtitle={`Taxa: ${stats?.conversionRate?.toFixed(2) || '0'}%`}
          trend={stats?.conversionsTrend}
        />
        <StatsCard
          title="Compras"
          value={stats?.totalPurchases?.toLocaleString() || '0'}
          subtitle={`Taxa: ${stats?.purchaseRate?.toFixed(2) || '0'}%`}
          trend={stats?.purchasesTrend}
        />
        <StatsCard
          title="Receita Total"
          value={formatCurrency(stats?.totalRevenue || 0)}
          subtitle={`Ticket: ${formatCurrency(stats?.avgOrderValue || 0)}`}
          trend={stats?.revenueTrend}
        />
      </div>

      {(campaignsUsage > 80 || clicksUsage > 80) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Atenção aos limites do plano
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {campaignsUsage > 80 && (
                    <li>Campanhas: {usage.campaigns}/{planLimits.maxCampaigns} ({campaignsUsage.toFixed(0)}%)</li>
                  )}
                  {clicksUsage > 80 && (
                    <li>Clicks: {usage.clicks?.toLocaleString()}/{planLimits.maxClicks?.toLocaleString()} ({clicksUsage.toFixed(0)}%)</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {stats?.timeline && stats.timeline.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Performance - Últimos 7 Dias</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#3B82F6" name="Views" />
              <Line type="monotone" dataKey="conversions" stroke="#10B981" name="Conversão Secundária" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Últimas Campanhas</h2>
          <Link href="/campaigns" className="text-sm text-blue-600 hover:text-blue-900">
            Ver todas
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">Você ainda não criou nenhuma campanha</p>
            <Link href="/campaigns/new">
              <Button>Criar Primeira Campanha</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campanha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.slice(0, 5).map((campaign: any) => {
                  const fullUrl = campaign.customDomain 
                    ? `https://${campaign.customDomain.domain}/r/${campaign.slug}`
                    : `/r/${campaign.slug}`;
                  
                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-xs text-gray-500">
                          {campaign.variations?.length || 0} variações
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900">
                          {fullUrl.length > 40 ? fullUrl.substring(0, 40) + '...' : fullUrl}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link href={`/campaigns/${campaign.id}/edit`} className="text-blue-600 hover:text-blue-900 mr-3">
                          Editar
                        </Link>
                        <Link href={`/campaigns/${campaign.id}`} className="text-green-600 hover:text-green-900">
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
      </div>
    </div>
  );
}
