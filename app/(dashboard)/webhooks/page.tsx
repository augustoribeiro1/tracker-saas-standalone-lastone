'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { WEBHOOK_PLATFORMS } from '@/lib/webhook-platforms';
import { getPlanLimits, planNameToId } from '@/lib/plan-limits';
import { PlanLimitReached } from '@/components/PlanLimitReached';

export default function WebhooksPage() {
  const { data: session } = useSession();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null);
  const [creatingPlatform, setCreatingPlatform] = useState<string | null>(null);

  // ✅ NOVO: Estado para conversões
  const [conversions, setConversions] = useState<any[]>([]);
  const [conversionsLoading, setConversionsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchWebhooks();
    fetchConversions(1);
  }, []);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchConversions(currentPage);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, currentPage]);

  const fetchWebhooks = async () => {
    const res = await fetch('/api/webhooks/manage');
    const data = await res.json();
    setWebhooks(data.webhooks || []);
    setLoading(false);
  };

  const fetchConversions = async (page: number) => {
    setConversionsLoading(true);
    try {
      const res = await fetch(`/api/webhooks/conversions?page=${page}&per_page=50`);
      const data = await res.json();
      setConversions(data.conversions || []);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching conversions:', error);
    } finally {
      setConversionsLoading(false);
    }
  };

  // ✅ CRIAR WEBHOOK PARA PLATAFORMA SELECIONADA
  const createWebhook = async (platform: string) => {
    setCreatingPlatform(platform);
    
    const res = await fetch('/api/webhooks/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform })
    });

    const data = await res.json();
    
    if (res.ok) {
      setSelectedWebhook(data.webhook);
      setShowPlatformModal(false);
      setShowDetailsModal(true);
      fetchWebhooks();
    } else {
      alert(data.error || 'Erro ao criar webhook');
    }
    
    setCreatingPlatform(null);
  };

  const deleteWebhook = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este webhook?')) return;
    
    await fetch(`/api/webhooks/manage?id=${id}`, { method: 'DELETE' });
    fetchWebhooks();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para área de transferência!');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // ✅ FILTRAR PLATAFORMAS JÁ ADICIONADAS
  const getAvailablePlatforms = () => {
    const addedPlatforms = webhooks.map(w => w.platform.toLowerCase());
    return Object.values(WEBHOOK_PLATFORMS).filter(
      platform => !addedPlatforms.includes(platform.id)
    );
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Plataformas de Checkout</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure webhooks para rastrear vendas de plataformas de checkout
        </p>
      </div>

      {/* ✅ BOTÃO ADICIONAR NOVO OU LIMITE ATINGIDO */}
      {!loading && (() => {
        const userPlan = session?.user?.plan || 'free';
        const planId = planNameToId(userPlan);
        const limits = getPlanLimits(planId);
        const canAdd = webhooks.length < limits.webhooks;

        return canAdd ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Adicionar Plataforma</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Selecione uma plataforma de checkout para integrar ({webhooks.length}/{limits.webhooks} em uso)
                </p>
              </div>
              <Button
                onClick={() => setShowPlatformModal(true)}
                className="flex items-center gap-2"
              >
                <span>➕</span> Adicionar Novo
              </Button>
            </div>
          </div>
        ) : (
          <PlanLimitReached
            resource="checkouts"
            current={webhooks.length}
            max={limits.webhooks}
            planName={limits.name}
            upgradeMessage={limits.upgradeMessage}
          />
        );
      })()}

      {/* Webhooks Ativos */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Webhooks Configurados</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">Carregando...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nenhum webhook configurado ainda. Clique em "Adicionar Novo" acima!
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plataforma</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {webhooks.map((webhook) => {
                const platformInfo = WEBHOOK_PLATFORMS[webhook.platform.toLowerCase() as keyof typeof WEBHOOK_PLATFORMS];
                return (
                  <tr key={webhook.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{platformInfo?.icon || '📦'}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {platformInfo?.name || webhook.platform}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900">
                          .../{webhook.platform}/{webhook.webhookUrl.split('/').pop()?.substring(0, 12)}...
                        </code>
                        <button
                          onClick={() => copyToClipboard(webhook.webhookUrl)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                          title="Copiar URL completa"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        webhook.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusText(webhook.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => deleteWebhook(webhook.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* TABELA DE CONVERSÕES */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Compras Registradas</h2>
            <p className="text-sm text-gray-500 mt-1">
              Últimas conversões recebidas via webhook
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-refresh (30s)
            </label>
            <Button
              size="sm"
              onClick={() => fetchConversions(currentPage)}
              disabled={conversionsLoading}
            >
              🔄 Atualizar
            </Button>
          </div>
        </div>

        {conversionsLoading ? (
          <div className="p-6 text-center">Carregando conversões...</div>
        ) : conversions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p className="mb-2">Nenhuma conversão registrada ainda</p>
            <p className="text-xs">
              As conversões aparecerão aqui quando os webhooks receberem notificações de compra
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campanha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Click ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTM Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTM Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTM Medium</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTM Content</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {conversions.map((conversion) => {
                    // Verificar se é realmente rastreado (clickId existe e não é "untracked")
                    const isTracked = conversion.clickId && !conversion.clickId.toLowerCase().includes('untracked');

                    return (
                      <tr
                        key={conversion.id}
                        className={`${
                          isTracked
                            ? 'bg-green-50 hover:bg-green-100'
                            : 'bg-red-50 hover:bg-red-100'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm">
                          {conversion.campaign ? (
                            <a
                              href={`/campaigns/${conversion.campaign.id}`}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              {conversion.campaign.name}
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isTracked ? (
                            <code className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-mono">
                              {conversion.clickId.substring(0, 12)}...
                            </code>
                          ) : (
                            <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded font-semibold">
                              Não rastreado
                            </span>
                          )}
                        </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {conversion.utmSource || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {conversion.utmCampaign || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {conversion.utmMedium || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {conversion.utmContent || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(conversion.eventValue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(conversion.createdAt)}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Página {pagination.page} de {pagination.totalPages} 
                  <span className="ml-2 text-gray-500">
                    ({pagination.total} conversões no total)
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchConversions(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ← Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchConversions(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Próxima →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ✅ MODAL DE SELEÇÃO DE PLATAFORMA */}
      {showPlatformModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Selecione a Plataforma
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Escolha a plataforma de checkout que deseja integrar
              </p>
            </div>

            <div className="p-6">
              {getAvailablePlatforms().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">Todas as plataformas disponíveis já foram adicionadas!</p>
                  <p className="text-sm">Você já configurou todas as integrações.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getAvailablePlatforms().map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => createWebhook(platform.id)}
                      disabled={creatingPlatform === platform.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{platform.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{platform.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{platform.description}</p>
                          {creatingPlatform === platform.id && (
                            <p className="text-xs text-blue-600 mt-2">Criando...</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowPlatformModal(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES/INSTRUÇÕES */}
      {showDetailsModal && selectedWebhook && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Configurar Webhook - {WEBHOOK_PLATFORMS[selectedWebhook.platform.toLowerCase() as keyof typeof WEBHOOK_PLATFORMS]?.name || selectedWebhook.platform}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedWebhook.webhookUrl}
                    readOnly
                    className="flex-1 rounded-md border-gray-300 bg-gray-50 text-sm font-mono text-gray-900 px-3 py-2 border-2"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(selectedWebhook.webhookUrl)}
                  >
                    📋 Copiar
                  </Button>
                </div>
              </div>

              {/* Instruções */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-sm mb-3 text-blue-900">📋 Passo a Passo:</h4>
                <ol className="text-sm text-blue-900 space-y-2 list-decimal list-inside">
                  <li>Acesse o painel da {WEBHOOK_PLATFORMS[selectedWebhook.platform.toLowerCase() as keyof typeof WEBHOOK_PLATFORMS]?.name}</li>
                  <li>Vá em Configurações → Webhooks ou Postback</li>
                  <li>Cole a URL acima</li>
                  <li>Selecione os eventos de compra/venda</li>
                  <li>Salve e teste o webhook</li>
                </ol>
              </div>

              {/* Aviso importante */}
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Importante:</strong> Para rastrear as vendas vinculadas às campanhas, 
                  certifique-se de que o parâmetro <code className="bg-yellow-100 px-1">utm_term</code> 
                  seja passado da página de destino até o checkout.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Total Recebidos</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedWebhook.totalReceived}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="text-2xl font-bold text-green-600">
                    {getStatusText(selectedWebhook.status)}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <Button onClick={() => setShowDetailsModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
