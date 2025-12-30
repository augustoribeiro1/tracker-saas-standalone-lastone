'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function DomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [showInstructions, setShowInstructions] = useState<any>(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    const res = await fetch('/api/domains');
    const data = await res.json();
    setDomains(data.domains || []);
    setLoading(false);
  };

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch('/api/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: newDomain })
    });

    if (res.ok) {
      const data = await res.json();
      setNewDomain('');
      setShowInstructions(data.domain);
      fetchDomains();
    } else {
      const error = await res.json();
      alert(error.error || 'Erro ao adicionar domínio');
    }
  };

  const verifyDomain = async (domainId: number) => {
    const res = await fetch(`/api/domains/verify/${domainId}`, {
      method: 'POST'
    });

    const data = await res.json();
    if (data.success) {
      alert('DNS configurado corretamente! ✅');
      fetchDomains();
    } else {
      alert('DNS ainda não configurado. Aguarde alguns minutos e tente novamente.');
    }
  };

  const deleteDomain = async (domainId: number) => {
    if (!confirm('Tem certeza que deseja deletar este domínio?')) return;
    
    await fetch(`/api/domains?id=${domainId}`, { method: 'DELETE' });
    fetchDomains();
  };

  const fixOldDomains = async () => {
    if (!confirm('Isso vai buscar o DNS correto de todos os domínios antigos. Continuar?')) return;
    
    const res = await fetch('/api/domains/fix-dns');
    const data = await res.json();
    
    if (data.updated > 0) {
      alert(`✅ ${data.updated} domínio(s) corrigido(s)!`);
      fetchDomains();
    } else {
      alert(data.message || 'Nenhum domínio precisava ser corrigido');
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

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Domínios Customizados</h1>
        <p className="mt-1 text-sm text-gray-500">
          Use seu próprio domínio para os redirects (ex: track.seusite.com)
        </p>
      </div>

      {/* Adicionar Domínio */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Adicionar Novo Domínio</h2>
          <button
            onClick={fixOldDomains}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            🔧 Corrigir DNS de domínios antigos
          </button>
        </div>
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
          Use um subdomínio (track, go, click, etc)
        </p>
      </div>

      {/* Lista de Domínios */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Domínios Configurados</h2>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SSL</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {domains.map((domain) => (
                <tr key={domain.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {domain.domain}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(domain.status)}`}>
                      {domain.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {domain.dnsConfigured ? '✅ Configurado' : '⏳ Pendente'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {domain.sslStatus === 'active' ? '🔒 Ativo' : '⏳ Pendente'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => setShowInstructions(domain)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Ver Instruções
                    </button>
                    {!domain.dnsConfigured && (
                      <button
                        onClick={() => verifyDomain(domain.id)}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Verificar DNS
                      </button>
                    )}
                    <button
                      onClick={() => deleteDomain(domain.id)}
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

      {/* Modal de Instruções DNS */}
      {showInstructions && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Configurar DNS - {showInstructions.domain}</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-sm mb-3">📋 Configuração DNS:</h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium text-gray-900">Tipo:</div>
                    <div><code className="bg-white px-2 py-1 rounded">CNAME</code></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium text-gray-900">Nome:</div>
                    <div><code className="bg-white px-2 py-1 rounded">{showInstructions.domain}</code></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium text-gray-900">Valor:</div>
                    <div>
                      <code className="bg-white px-2 py-1 rounded">
                        cname.vercel-dns.com
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⏰ <strong>Atenção:</strong> A propagação DNS pode levar de 5 minutos até 48 horas. Aguarde alguns minutos e clique em "Verificar DNS".
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
