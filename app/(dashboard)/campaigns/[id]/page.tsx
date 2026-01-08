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
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
          {/* Botão Editar */}
          <a
            href={`/campaigns/${params.id}/edit`}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ✏️ Editar Campanha
          </a>
          {/* Datas com labels */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Data Inicial</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="rounded-md border-2 border-gray-300 shadow-sm text-sm px-3 py-2 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Data Final</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="rounded-md border-2 border-gray-300 shadow-sm text-sm px-3 py-2 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
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
        {/* Timeline - ✅ ESCALA DINÂMICA */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Performance ao Longo do Tempo</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 'auto']} allowDataOverflow={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#3B82F6" name="Views" strokeWidth={2} />
              <Line type="monotone" dataKey="conversions" stroke="#10B981" name="Conversão Secundária" strokeWidth={2} />
              <Line type="monotone" dataKey="purchases" stroke="#F59E0B" name="Compras" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2">Views, conversões e compras no período selecionado</p>
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

      {/* Compras Registradas */}
      <PurchasesTable campaignId={params.id as string} />
    </div>
  );
}

// Componente para exibir compras registradas
function PurchasesTable({ campaignId }: { campaignId: string }) {
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  useEffect(() => {
    fetchConversions();
  }, [page]);

  const fetchConversions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/webhooks/conversions?campaignId=${campaignId}&page=${page}&per_page=50`);
      const data = await res.json();
      setConversions(data.conversions || []);
      setPagination(data.pagination || { totalPages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching conversions:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Compras Registradas</h2>
        <div className="text-center py-8">Carregando compras...</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">Compras Registradas</h2>
        <span className="text-sm text-gray-600">Total: {pagination.total}</span>
      </div>

      {conversions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhuma compra registrada para esta campanha ainda.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Click ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campanha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTM Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTM Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTM Term</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {conversions.map((conversion: any) => (
                  <tr key={conversion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(conversion.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {conversion.clickId || 'N/A'}
                        </code>
                        {conversion.clickId && (
                          <button
                            onClick={() => copyToClipboard(conversion.clickId)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copiar Click ID"
                          >
                            📋
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {conversion.campaign?.name || 'Não rastreado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(parseFloat(conversion.eventValue || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {conversion.utmSource || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {conversion.utmCampaign || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {conversion.utmTerm || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                  disabled={page === pagination.totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Página <span className="font-medium">{page}</span> de{' '}
                    <span className="font-medium">{pagination.totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                      disabled={page === pagination.totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      →
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
