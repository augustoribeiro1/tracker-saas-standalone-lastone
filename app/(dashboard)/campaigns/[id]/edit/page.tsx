'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    enableSecondaryConversion: false,
    checkoutUrl: '',
    variations: [
      { id: 0, name: 'Variação A', destinationUrl: '', weight: 50 },
      { id: 0, name: 'Variação B', destinationUrl: '', weight: 50 }
    ]
  });

  // Calcular soma total de weights
  const totalWeight = formData.variations.reduce((sum, v) => sum + (v.weight || 0), 0);
  const isWeightValid = totalWeight === 100;

  useEffect(() => {
    fetchCampaign();
  }, []);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${params.id}`);
      const data = await res.json();
      
      if (res.ok) {
        setFormData({
          name: data.campaign.name,
          slug: data.campaign.slug,
          enableSecondaryConversion: data.campaign.enableSecondaryConversion || false,
          checkoutUrl: data.campaign.checkoutUrl || '',
          variations: data.campaign.variations.map((v: any) => ({
            id: v.id,
            name: v.name,
            destinationUrl: v.destinationUrl,
            weight: v.weight
          }))
        });
      }
    } catch (error) {
      console.error('Erro ao carregar campanha:', error);
    } finally {
      setFetching(false);
    }
  };

  // Função para adicionar https:// se não tiver protocolo
  const normalizeUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return 'https://' + url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validar peso total
    if (totalWeight !== 100) {
      setError(`A soma das porcentagens deve ser 100%. Atual: ${totalWeight}%`);
      setLoading(false);
      return;
    }

    // Validar checkout URL se conversão secundária estiver ativada
    if (formData.enableSecondaryConversion && !formData.checkoutUrl) {
      setError('URL do Checkout é obrigatória quando Conversão Secundária está ativada');
      setLoading(false);
      return;
    }

    try {
      // Normalizar URLs antes de enviar
      const normalizedData = {
        ...formData,
        checkoutUrl: formData.checkoutUrl ? normalizeUrl(formData.checkoutUrl) : null,
        variations: formData.variations.map(v => ({
          ...v,
          destinationUrl: normalizeUrl(v.destinationUrl)
        }))
      };

      const res = await fetch(`/api/campaigns/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedData)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar campanha');
        console.error('Erro ao atualizar campanha:', data);
        return;
      }

      router.push('/campaigns');
    } catch (error) {
      console.error('Erro ao atualizar campanha:', error);
      setError('Erro ao atualizar campanha. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Editar Campanha</h1>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Campanha</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 px-3 py-2 bg-white text-gray-900"
            placeholder="Ex: Campanha Black Friday"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Slug (URL)</label>
          <input
            type="text"
            required
            value={formData.slug}
            onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 px-3 py-2 bg-white text-gray-900"
            placeholder="black-friday"
          />
          <p className="mt-1 text-sm text-gray-500">
            URL será: /r/{formData.slug || 'seu-slug'}
          </p>
        </div>

        {/* Conversão Secundária */}
        <div className="border-t pt-6">
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              id="enableSecondaryConversion"
              checked={formData.enableSecondaryConversion}
              onChange={e => setFormData({...formData, enableSecondaryConversion: e.target.checked})}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="enableSecondaryConversion" className="block text-sm font-medium text-gray-900 cursor-pointer">
                Ativar Conversão Secundária (Tracking de Cliques no Checkout)
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Gera uma URL especial para trackear quando visitantes clicam no botão "Comprar" da sua página
              </p>
            </div>
          </div>

          {formData.enableSecondaryConversion && (
            <div className="ml-7 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Checkout <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required={formData.enableSecondaryConversion}
                  value={formData.checkoutUrl}
                  onChange={e => setFormData({...formData, checkoutUrl: e.target.value})}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 px-3 py-2 bg-white text-gray-900"
                  placeholder="https://meusite.com/checkout"
                />
                <p className="mt-1 text-sm text-gray-500">
                  URL para onde o visitante será redirecionado após clicar no botão de compra
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">📋 Como usar:</h4>
                <ol className="text-sm text-blue-800 space-y-2 ml-4 list-decimal">
                  <li>
                    Altere os botões "Comprar" da sua página de vendas para apontar para:
                    <code className="block mt-1 bg-white px-2 py-1 rounded text-blue-900 font-mono text-xs">
                      /c/{formData.slug || 'seu-slug'}
                    </code>
                  </li>
                  <li>
                    Quando o visitante clicar, será registrada a conversão secundária
                  </li>
                  <li>
                    Em seguida, será redirecionado automaticamente para o checkout configurado acima
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Variações</h3>
            <span className={`text-sm font-medium ${isWeightValid ? 'text-green-600' : 'text-red-600'}`}>
              Total: {totalWeight}% {isWeightValid ? '✓' : '(deve ser 100%)'}
            </span>
          </div>
          {formData.variations.map((v, idx) => (
            <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Variação {idx + 1}
                  </label>
                  <input
                    type="text"
                    placeholder="Nome da variação"
                    value={v.name}
                    onChange={e => {
                      const newVars = [...formData.variations];
                      newVars[idx].name = e.target.value;
                      setFormData({...formData, variations: newVars});
                    }}
                    className="block w-full rounded-md border-2 border-gray-300 px-3 py-2 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    % de Tráfego
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="50"
                    value={v.weight}
                    onChange={e => {
                      const newVars = [...formData.variations];
                      newVars[idx].weight = parseInt(e.target.value) || 0;
                      setFormData({...formData, variations: newVars});
                    }}
                    className="block w-full rounded-md border-2 border-gray-300 px-3 py-2 bg-white text-gray-900"
                  />
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL de Destino
              </label>
              <input
                type="text"
                placeholder="google.com ou https://google.com"
                required
                value={v.destinationUrl}
                onChange={e => {
                  const newVars = [...formData.variations];
                  newVars[idx].destinationUrl = e.target.value;
                  setFormData({...formData, variations: newVars});
                }}
                className="block w-full rounded-md border-2 border-gray-300 px-3 py-2 bg-white text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">
                Pode inserir com ou sem https://
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/campaigns')}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !isWeightValid} className="flex-1">
            {loading ? 'Salvando...' : isWeightValid ? 'Salvar Alterações' : 'Ajuste as % (total deve ser 100%)'}
          </Button>
        </div>
      </form>
    </div>
  );
}
