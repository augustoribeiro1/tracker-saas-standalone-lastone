'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = () => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(data => {
        setCampaigns(data.campaigns || []);
        setLoading(false);
      });
  };

  const deleteCampaign = async (id: number, name: string) => {
    if (!confirm(`Tem certeza que deseja deletar a campanha "${name}"? Todos os dados serão perdidos!`)) {
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Campanha deletada com sucesso!');
        fetchCampaigns();
      } else {
        alert('Erro ao deletar campanha');
      }
    } catch (error) {
      alert('Erro ao deletar campanha');
    }
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Campanhas</h1>
        </div>
        <Link href="/campaigns/new">
          <Button>Nova Campanha</Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Nenhuma campanha ainda</p>
          <Link href="/campaigns/new">
            <Button>Criar Primeira Campanha</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL Completo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((c: any) => {
                const fullUrl = c.customDomain 
                  ? `https://${c.customDomain.domain}/r/${c.slug}`
                  : `/r/${c.slug}`;
                
                return (
                  <tr key={c.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {fullUrl}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(fullUrl.startsWith('http') ? fullUrl : `https://${window.location.host}${fullUrl}`);
                            alert('URL copiado!');
                          }}
                          className="text-blue-600 hover:text-blue-900 text-xs"
                          title="Copiar URL"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm space-x-3">
                      <Link href={`/campaigns/${c.id}/edit`} className="text-blue-600 hover:text-blue-900">
                        Editar
                      </Link>
                      <Link href={`/campaigns/${c.id}`} className="text-green-600 hover:text-green-900">
                        Analytics
                      </Link>
                      <button
                        onClick={() => deleteCampaign(c.id, c.name)}
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
        </div>
      )}
    </div>
  );
}
