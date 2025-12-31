'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/campaigns/${params.id}/analytics?start_date=${dateRange.start}&end_date=${dateRange.end}`
      );
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Carregando analytics...</div>;
  }

  if (!data) {
    return <div className="p-6">Erro ao carregar dados</div>;
  }

  const totalMetrics = data.metrics.reduce((acc: any, m: any) => ({
    views: acc.views + parseInt(m.views || 0),
    checkouts: acc.checkouts + parseInt(m.checkouts || 0),
    purchases: acc.purchases + parseInt(m.purchases || 0),
    revenue: acc.revenue + parseFloat(m.revenue || 0)
  }), { views: 0, checkouts: 0, purchases: 0, revenue: 0 });

  const avgCheckoutRate = totalMetrics.checkouts / totalMetrics.views * 100 || 0;
  const avgPurchaseRate = totalMetrics.purchases / totalMetrics.views * 100 || 0;
  const avgOrderValue = totalMetrics.revenue / totalMetrics.purchases || 0;

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{data.campaign.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Analytics e Performance</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="rounded-md border-2 border-gray-300 shadow-sm text-sm px-3 py-2 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="rounded-md border-2 border-gray-300 shadow-sm text-sm px-3 py-2 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Views"
          value={totalMetrics.views.toLocaleString()}
          subtitle="Visitantes únicos"
        />
        <StatsCard
          title="Conversão Secundária"
          value={totalMetrics.checkouts.toLocaleString()}
          subtitle={`${avgCheckoutRate.toFixed(2)}% de conversão`}
        />
        <StatsCard
          title="Compras"
          value={totalMetrics.purchases.toLocaleString()}
          subtitle={`${avgPurchaseRate.toFixed(2)}% de conversão`}
        />
        <StatsCard
          title="Receita Total"
          value={formatCurrency(totalMetrics.revenue)}
          subtitle={`Ticket médio: ${formatCurrency(avgOrderValue)}`}
        />
      </div>

      {/* Comparação de Variações */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Comparação de Variações</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variação</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conv. Secundária</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa %</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Compras</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa %</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(() => {
                // Calcular qual variação tem melhor taxa de compras
                const totalPurchases = data.metrics.reduce((sum: number, m: any) => sum + parseInt(m.purchases || 0), 0);
                const hasPurchases = totalPurchases > 0;
                
                let bestVariationId: number | null = null;
                let bestPurchaseRate = -1;
                
                if (hasPurchases) {
                  data.metrics.forEach((m: any) => {
                    const rate = parseFloat(m.purchase_rate || 0);
                    const purchases = parseInt(m.purchases || 0);
                    if (purchases > 0 && rate > bestPurchaseRate) {
                      bestPurchaseRate = rate;
                      bestVariationId = m.variation_id;
                    }
                  });
                }
                
                return data.metrics.map((metric: any) => {
                  const isBest = hasPurchases && metric.variation_id === bestVariationId;
                  
                  return (
                    <tr key={metric.variation_id} className={isBest ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {metric.variation_name}
                        {isBest && <span className="ml-2 text-xs text-green-600">🏆 Melhor</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {parseInt(metric.views || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {parseInt(metric.checkouts || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {parseFloat(metric.checkout_rate || 0).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {parseInt(metric.purchases || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {parseFloat(metric.purchase_rate || 0).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatCurrency(parseFloat(metric.revenue || 0))}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Views ao Longo do Tempo</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#3B82F6" name="Views" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2">Total de views (todas variações)</p>
        </div>

        {/* Distribuição de Views por Variação */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Distribuição de Tráfego</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.metrics}
                dataKey="views"
                nameKey="variation_name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.metrics.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funil de Conversão */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Funil de Conversão</h2>
        <div className="space-y-6">
          {data.metrics.map((metric: any) => {
            const views = parseInt(metric.views || 0);
            const checkouts = parseInt(metric.checkouts || 0);
            const purchases = parseInt(metric.purchases || 0);
            
            const checkoutPercent = views > 0 ? (checkouts / views * 100) : 0;
            const purchasePercent = views > 0 ? (purchases / views * 100) : 0;
            
            return (
              <div key={metric.variation_id}>
                <h3 className="text-sm font-medium text-gray-700 mb-3">{metric.variation_name}</h3>
                <div className="space-y-2">
                  {/* Views */}
                  <div className="relative">
                    <div className="h-10 bg-blue-500 rounded flex items-center px-3" style={{ width: '100%' }}>
                      <span className="text-sm font-medium text-white">Views: {views}</span>
                    </div>
                  </div>
                  
                  {/* Conv. Secundária */}
                  <div className="relative">
                    <div className="h-10 bg-green-500 rounded flex items-center px-3" style={{ width: `${Math.max(checkoutPercent, 15)}%` }}>
                      <span className="text-sm font-medium text-white">Conv. Sec.: {checkouts}</span>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">{checkoutPercent.toFixed(1)}%</span>
                  </div>
                  
                  {/* Compras */}
                  <div className="relative">
                    <div className="h-10 bg-orange-500 rounded flex items-center px-3" style={{ width: `${Math.max(purchasePercent, 15)}%` }}>
                      <span className="text-sm font-medium text-white">Compras: {purchases}</span>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">{purchasePercent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
