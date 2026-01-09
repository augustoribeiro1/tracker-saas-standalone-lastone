'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plataformas de Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium">Adicionar Plataforma</h2>
                  <p className="text-sm text-muted-foreground mt-1">
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
            </CardContent>
          </Card>
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
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Carregando...</div>
          ) : webhooks.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum webhook configurado ainda. Clique em "Adicionar Novo" acima!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Plataforma</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">URL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {webhooks.map((webhook) => {
                    const platformInfo = WEBHOOK_PLATFORMS[webhook.platform.toLowerCase() as keyof typeof WEBHOOK_PLATFORMS];
                    return (
                      <tr key={webhook.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{platformInfo?.icon || '📦'}</span>
                            <Badge>
                              {platformInfo?.name || webhook.platform}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              .../{webhook.platform}/{webhook.webhookUrl.split('/').pop()?.substring(0, 12)}...
                            </code>
                            <button
                              onClick={() => copyToClipboard(webhook.webhookUrl)}
                              className="text-primary hover:underline text-sm"
                              title="Copiar URL completa"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={webhook.status === 'active' ? 'default' : 'secondary'}>
                            {getStatusText(webhook.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => {
                              setSelectedWebhook(webhook);
                              setShowDetailsModal(true);
                            }}
                            className="text-primary hover:underline mr-4"
                          >
                            Ver Detalhes
                          </button>
                          <button
                            onClick={() => deleteWebhook(webhook.id)}
                            className="text-destructive hover:underline"
                          >
                            Deletar
                          </button>
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

      {/* TABELA DE CONVERSÕES */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Compras Registradas</CardTitle>
              <CardDescription className="mt-1">
                Últimas conversões recebidas via webhook
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-input"
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
        </CardHeader>
        <CardContent>

        {conversionsLoading ? (
          <div className="p-6 text-center text-muted-foreground">Carregando conversões...</div>
        ) : conversions.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <p className="mb-2">Nenhuma conversão registrada ainda</p>
            <p className="text-xs">
              As conversões aparecerão aqui quando os webhooks receberem notificações de compra
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Campanha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Click ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">UTM Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">UTM Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">UTM Medium</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">UTM Content</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {conversions.map((conversion) => {
                    // Verificar se é realmente rastreado (clickId existe e não é "untracked")
                    const isTracked = conversion.clickId && !conversion.clickId.toLowerCase().includes('untracked');

                    return (
                      <tr
                        key={conversion.id}
                        className={`${
                          isTracked
                            ? 'bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/30'
                            : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm">
                          {conversion.campaign ? (
                            <a
                              href={`/campaigns/${conversion.campaign.id}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {conversion.campaign.name}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isTracked ? (
                            <code className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded font-mono">
                              {conversion.clickId.substring(0, 12)}...
                            </code>
                          ) : (
                            <span className="text-xs bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded font-semibold">
                              Não rastreado
                            </span>
                          )}
                        </td>
                      <td className="px-4 py-3 text-sm">
                        {conversion.utmSource || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {conversion.utmCampaign || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {conversion.utmMedium || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {conversion.utmContent || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatCurrency(conversion.eventValue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
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
              <div className="pt-4 mt-4 border-t flex items-center justify-between">
                <div className="text-sm">
                  Página {pagination.page} de {pagination.totalPages}
                  <span className="ml-2 text-muted-foreground">
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
        </CardContent>
      </Card>

      {/* ✅ MODAL DE SELEÇÃO DE PLATAFORMA */}
      {showPlatformModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Selecione a Plataforma</CardTitle>
              <CardDescription>
                Escolha a plataforma de checkout que deseja integrar
              </CardDescription>
            </CardHeader>

            <CardContent>
              {getAvailablePlatforms().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
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
                      className="p-4 border-2 rounded-lg hover:border-primary hover:bg-accent transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{platform.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-medium">{platform.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{platform.description}</p>
                          {creatingPlatform === platform.id && (
                            <p className="text-xs text-primary mt-2">Criando...</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>

            <div className="px-6 py-4 border-t flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowPlatformModal(false)}
              >
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL DE DETALHES/INSTRUÇÕES */}
      {showDetailsModal && selectedWebhook && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                Configurar Webhook - {WEBHOOK_PLATFORMS[selectedWebhook.platform.toLowerCase() as keyof typeof WEBHOOK_PLATFORMS]?.name || selectedWebhook.platform}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* URL */}
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={selectedWebhook.webhookUrl}
                    readOnly
                    className="flex-1 font-mono text-sm"
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
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium text-sm mb-3 text-blue-900 dark:text-blue-200">📋 Passo a Passo:</h4>
                <ol className="text-sm text-blue-900 dark:text-blue-300 space-y-2 list-decimal list-inside">
                  <li>Acesse o painel da {WEBHOOK_PLATFORMS[selectedWebhook.platform.toLowerCase() as keyof typeof WEBHOOK_PLATFORMS]?.name}</li>
                  <li>Vá em Configurações → Webhooks ou Postback</li>
                  <li>Cole a URL acima</li>
                  <li>Selecione os eventos de compra/venda</li>
                  <li>Salve e teste o webhook</li>
                </ol>
              </div>

              {/* Aviso importante */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Importante:</strong> Para rastrear as vendas vinculadas às campanhas,
                  certifique-se de que o parâmetro <code className="bg-yellow-100 dark:bg-yellow-900 px-1">utm_term</code>
                  seja passado da página de destino até o checkout.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Recebidos</p>
                  <p className="text-2xl font-bold">{selectedWebhook.totalReceived}</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {getStatusText(selectedWebhook.status)}
                  </p>
                </div>
              </div>
            </CardContent>

            <div className="px-6 py-4 border-t flex justify-end">
              <Button onClick={() => setShowDetailsModal(false)}>
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
