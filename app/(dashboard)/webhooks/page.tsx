'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { WEBHOOK_PLATFORMS } from '@/lib/webhook-platforms';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState<any>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    const res = await fetch('/api/webhooks/manage');
    const data = await res.json();
    setWebhooks(data.webhooks || []);
    setLoading(false);
  };

  const createWebhook = async (platform: string) => {
    const res = await fetch('/api/webhooks/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform })
    });

    const data = await res.json();
    setNewWebhook(data.webhook);
    setShowModal(true);
    fetchWebhooks();
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

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Plataformas de Checkout</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure webhooks para rastrear vendas de plataformas de checkout
        </p>
      </div>

      {/* Plataformas Disponíveis */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Adicionar Novo Webhook</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.values(WEBHOOK_PLATFORMS).map((platform) => (
            <button
              key={platform.id}
              onClick={() => createWebhook(platform.id)}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{platform.icon}</div>
                <p className="font-medium text-sm text-gray-900">{platform.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Webhooks Ativos */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Webhooks Configurados</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">Carregando...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nenhum webhook configurado ainda. Adicione um acima!
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plataforma</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recebidos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {webhooks.map((webhook) => (
                <tr key={webhook.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {webhook.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900">
                      {webhook.webhookUrl.substring(0, 50)}...
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      webhook.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {webhook.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {webhook.totalReceived}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => {
                        setNewWebhook(webhook);
                        setShowModal(true);
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Instruções */}
      {showModal && newWebhook && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Configurar Webhook - {newWebhook.platform}</h3>
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
                    value={newWebhook.webhookUrl}
                    readOnly
                    className="flex-1 rounded-md border-gray-300 bg-gray-50 text-sm font-mono text-gray-900"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(newWebhook.webhookUrl)}
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              {/* Secret */}
              {newWebhook.webhookSecret && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook Secret
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newWebhook.webhookSecret}
                      readOnly
                      className="flex-1 rounded-md border-gray-300 bg-gray-50 text-sm font-mono text-gray-900"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(newWebhook.webhookSecret)}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              )}

              {/* Instruções */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">📋 Passo a Passo:</h4>
                <ol className="text-sm space-y-2 list-decimal list-inside">
                  <li>Acesse o painel da {newWebhook.platform}</li>
                  <li>Vá em Configurações → Webhooks</li>
                  <li>Cole a URL acima</li>
                  {newWebhook.webhookSecret && <li>Cole o Secret acima</li>}
                  <li>Selecione os eventos de compra/venda</li>
                  <li>Salve e teste o webhook</li>
                </ol>
              </div>

              {/* Teste */}
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Importante:</strong> Certifique-se de que suas URLs de checkout incluem o parâmetro <code className="bg-yellow-100 px-1">utm_term</code> para rastrear as vendas corretamente.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <Button onClick={() => setShowModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
