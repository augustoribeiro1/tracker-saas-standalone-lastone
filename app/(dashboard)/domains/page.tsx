'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { PlanLimitReached } from '@/components/PlanLimitReached';
import { getPlanLimits } from '@/lib/plan-limits';

export default function DomainsPage() {
  const { data: session } = useSession();
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [showInstructions, setShowInstructions] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    const res = await fetch('/api/domains/list');
    const data = await res.json();
    setDomains(data.domains || []);
    setLimits(data.limits || null);
    setLoading(false);
  };

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ CORRIGIDO: Usar API nova do Cloudflare
    const res = await fetch('/api/domains/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: newDomain })
    });

    if (res.ok) {
      const data = await res.json();
      setNewDomain('');
      
      // ✅ Mostrar instruções DNS da resposta da API
      setShowInstructions({
        ...data.domain,
        dnsInstructions: data.dnsInstructions
      });
      
      fetchDomains();
    } else {
      const error = await res.json();
      alert(error.error || 'Erro ao adicionar domínio');
    }
  };

  const verifyDomain = async (domainId: number) => {
    // ✅ CORRIGIDO: Usar API nova do Cloudflare
    const res = await fetch(`/api/domains/verify?domainId=${domainId}`, {
      method: 'GET'
    });

    const data = await res.json();
    
    if (data.success) {
      if (data.domain.isActive) {
        alert('✅ DNS configurado e domínio ativo!');
      } else {
        alert(`⏳ Status: ${data.message}\n\nAguarde alguns minutos e tente novamente.`);
      }
      fetchDomains();
    } else {
      alert('Erro ao verificar DNS. Tente novamente.');
    }
  };

  const deleteDomain = async (domainId: number) => {
    if (!confirm('Tem certeza que deseja deletar este domínio?')) return;
    
    // ✅ CORRIGIDO: Usar API nova do Cloudflare
    const res = await fetch(`/api/domains/delete?domainId=${domainId}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      alert('✅ Domínio deletado!');
      fetchDomains();
    } else {
      const error = await res.json();
      alert(error.error || 'Erro ao deletar domínio');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'verifying': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'pending': return 'Pendente';
      case 'verifying': return 'Verificando';
      case 'failed': return 'Falhou';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Domínios Customizados</h1>
        <p className="mt-1 text-sm text-gray-500">
          Use seu próprio domínio para os redirects (ex: track.seusite.com)
        </p>
      </div>

      {/* Adicionar Domínio */}
      {limits && limits.canAddMore ? (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Adicionar Novo Domínio</h2>
          <form onSubmit={addDomain} className="flex gap-4">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="track.seusite.com"
              className="flex-1 rounded-md border-2 border-gray-300 shadow-sm px-3 py-2 bg-white text-gray-900"
              required
            />
            <Button type="submit">Adicionar</Button>
          </form>
          <p className="mt-2 text-xs text-gray-500">
            Use um subdomínio (track, go, click, etc). Domínios personalizados: {limits.current}/{limits.max}
          </p>
        </div>
      ) : limits && limits.max === 0 ? (
        <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Plano {limits.plan}
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                Seu plano atual não permite domínios personalizados, mas você pode usar o domínio padrão <strong>app.split2.com.br</strong> em suas campanhas!
              </p>
              <a href="/pricing">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  🚀 Fazer Upgrade
                </Button>
              </a>
            </div>
          </div>
        </div>
      ) : (
        limits && <PlanLimitReached 
          resource="domínios"
          current={limits.current}
          max={limits.max}
          planName={limits.plan}
          upgradeMessage={getPlanLimits(session?.user?.planId || 1).upgradeMessage}
        />
      )}

      {/* Lista de Domínios */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Domínios Configurados</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">Carregando...</div>
        ) : domains.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nenhum domínio configurado ainda
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domínio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNS</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {domains.map((domain) => (
                <tr key={domain.id} className={domain.isDefault ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {domain.domain}
                      </span>
                      {domain.isDefault && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          Padrão
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(domain.status)}`}>
                      {getStatusText(domain.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {domain.dnsConfigured ? '✅ Configurado' : '⏳ Pendente'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-4">
                    {!domain.isDefault && (
                      <>
                        <button
                          onClick={() => setShowInstructions(domain)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver Instruções
                        </button>
                        <button
                          onClick={() => verifyDomain(domain.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          {domain.dnsConfigured ? 'Verificar' : 'Verificar DNS'}
                        </button>
                      </>
                    )}
                    {domain.canDelete && (
                      <button
                        onClick={() => deleteDomain(domain.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deletar
                      </button>
                    )}
                    {!domain.canDelete && !domain.isDefault && (
                      <span className="text-gray-400 text-xs">Não pode deletar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Instruções DNS */}
      {showInstructions && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Configurar DNS - {showInstructions.domain}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-sm mb-3 text-gray-900">📋 Configuração DNS:</h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium text-gray-900">Tipo:</div>
                    <div><code className="bg-white px-2 py-1 rounded text-gray-900">CNAME</code></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium text-gray-900">Nome:</div>
                    <div>
                      <code className="bg-white px-2 py-1 rounded text-gray-900">
                        {showInstructions.domain.split('.')[0]}
                      </code>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium text-gray-900">Valor:</div>
                    <div>
                      <code className="bg-white px-2 py-1 rounded text-gray-900">
                        app.split2.com.br
                      </code>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium text-gray-900">TTL:</div>
                    <div><code className="bg-white px-2 py-1 rounded text-gray-900">Auto ou 300</code></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium text-gray-900">Proxy:</div>
                    <div><code className="bg-white px-2 py-1 rounded text-gray-900">OFF / Nuvem Cinza</code></div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⏰ <strong>Atenção:</strong> A propagação DNS pode levar de 5 minutos até 48 horas. 
                  Aguarde alguns minutos e clique em "Verificar DNS".
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Passo a passo:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Acesse o painel do seu provedor de domínio (GoDaddy, Registro.br, etc)</li>
                  <li>Vá em "Gerenciar DNS" ou "Zona DNS"</li>
                  <li>Adicione um registro CNAME com os dados acima</li>
                  <li>Salve as alterações</li>
                  <li>Aguarde 5-10 minutos</li>
                  <li>Clique em "Verificar DNS" aqui no painel</li>
                </ol>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              {!showInstructions.dnsConfigured && (
                <Button
                  variant="outline"
                  onClick={() => {
                    verifyDomain(showInstructions.id);
                    setShowInstructions(null);
                  }}
                >
                  Verificar DNS Agora
                </Button>
              )}
              <Button onClick={() => setShowInstructions(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
