'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { getPlanLimits, planNameToId } from '@/lib/plan-limits';
import { PlanLimitReached } from '@/components/PlanLimitReached';

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [domains, setDomains] = useState<any[]>([]);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [loadingLimits, setLoadingLimits] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    customDomainId: '',
    enableSecondaryConversion: false,
    checkoutUrl: '',
    variations: [
      { name: 'Variação A', destinationUrl: '', weight: 50 },
      { name: 'Variação B', destinationUrl: '', weight: 50 }
    ]
  });

  // ✅ Carregar domínios e contagem de campanhas
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar domínios (inclui domínio padrão)
        const domainsRes = await fetch('/api/domains/list');
        const domainsData = await domainsRes.json();
        
        const activeDomains = (domainsData.domains || []).filter((d: any) => d.status === 'active');
        setDomains(activeDomains);
        
        // Selecionar primeiro domínio ativo automaticamente
        if (activeDomains.length > 0) {
          setFormData(prev => ({
            ...prev,
            customDomainId: activeDomains[0].id.toString()
          }));
        }

        // Buscar contagem de campanhas
        const campaignsRes = await fetch('/api/campaigns');
        const campaignsData = await campaignsRes.json();
        setCampaignsCount(campaignsData.campaigns?.length || 0);
        
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoadingLimits(false);
      }
    };

    fetchData();
  }, []);

  // Calcular soma total de weights
  const totalWeight = formData.variations.reduce((sum, v) => sum + (v.weight || 0), 0);
  const isWeightValid = totalWeight === 100;

  // Gerar URL completo
  const selectedDomain = domains.find(d => d.id.toString() === formData.customDomainId);
  const fullUrl = selectedDomain && formData.slug
    ? `https://${selectedDomain.domain}/r/${formData.slug}`
    : '';

  // Gerar URL de conversão secundária
  const conversionUrl = selectedDomain && formData.slug
    ? `https://${selectedDomain.domain}/c/${formData.slug}`
    : '';

  // Copiar URL para clipboard
  const copyUrl = () => {
    if (fullUrl) {
      navigator.clipboard.writeText(fullUrl);
      alert('URL copiado para área de transferência!');
    }
  };

  // Copiar URL de conversão
  const copyConversionUrl = () => {
    if (conversionUrl) {
      navigator.clipboard.writeText(conversionUrl);
      alert('URL copiado!');
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

    // Validar domínio selecionado
    if (!formData.customDomainId) {
      setError('Você precisa selecionar um domínio de tracking');
      setLoading(false);
      return;
    }

    // Validar checkout URL se conversão secundária estiver ativada
    if (formData.enableSecondaryConversion && !formData.checkoutUrl) {
      setError('URL de Destino é obrigatória quando Conversão Secundária está ativada');
      setLoading(false);
      return;
    }

    try {
      // Normalizar URLs antes de enviar
      const normalizedData = {
        ...formData,
        slug: formData.slug || '', // ✅ Garantir que slug seja string (pode ser vazio para domínio padrão)
        checkoutUrl: formData.checkoutUrl ? normalizeUrl(formData.checkoutUrl) : null,
        variations: formData.variations.map(v => ({
          ...v,
          destinationUrl: normalizeUrl(v.destinationUrl)
        }))
      };

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedData)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar campanha');
        console.error('Erro ao criar campanha:', data);
        return;
      }

      router.push('/campaigns');
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      setError('Erro ao criar campanha. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Nova Campanha</h1>
      
      {/* ✅ VERIFICAR LIMITE DE CAMPANHAS */}
      {!loadingLimits && (() => {
        const userPlan = session?.user?.plan || 'free';
        const planId = planNameToId(userPlan);
        const limits = getPlanLimits(planId);
        const canAdd = campaignsCount < limits.campaigns;

        if (!canAdd) {
          return (
            <PlanLimitReached
              resource="campanhas"
              current={campaignsCount}
              max={limits.campaigns}
              planName={limits.name}
              upgradeMessage={limits.upgradeMessage}
            />
          );
        }
        return null;
      })()}
      
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slug (URL) {domains.find(d => d.id.toString() === formData.customDomainId)?.domain === 'app.split2.com.br' && '(Opcional)'}
          </label>
          <input
            type="text"
            required={domains.find(d => d.id.toString() === formData.customDomainId)?.domain !== 'app.split2.com.br'}
            value={formData.slug}
            onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 px-3 py-2 bg-white text-gray-900"
            placeholder={
              domains.find(d => d.id.toString() === formData.customDomainId)?.domain === 'app.split2.com.br'
                ? 'Será gerado automaticamente'
                : 'black-friday'
            }
            disabled={domains.find(d => d.id.toString() === formData.customDomainId)?.domain === 'app.split2.com.br'}
          />
          {domains.find(d => d.id.toString() === formData.customDomainId)?.domain === 'app.split2.com.br' && (
            <p className="mt-1 text-xs text-gray-500">
              O slug será gerado automaticamente no formato: seu-id-abc123de
            </p>
          )}
        </div>

        {/* Seletor de Domínio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Domínio</label>
          <select
            required
            value={formData.customDomainId}
            onChange={e => setFormData({...formData, customDomainId: e.target.value})}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 px-3 py-2 bg-white text-gray-900"
          >
            <option value="">Selecione um domínio</option>
            {domains.map(domain => (
              <option key={domain.id} value={domain.id}>
                {domain.domain} {domain.isDefault ? '(Padrão)' : ''}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">
            {domains.find(d => d.id.toString() === formData.customDomainId)?.domain === 'app.split2.com.br' 
              ? '💡 Slug será gerado automaticamente com seu ID para evitar conflitos'
              : 'Use um slug único para seu domínio'
            }
          </p>
        </div>

        {/* ✅ AJUSTE 2: URL Completo com botão Copiar */}
        {fullUrl && (
          <div className="rounded-lg bg-blue-50 p-4 border-2 border-blue-200">
            <label className="block text-sm font-medium text-blue-900 mb-2">
              🔗 URL da Campanha (copie e cole nos seus anúncios):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={fullUrl}
                className="flex-1 rounded-md border-2 border-blue-300 bg-white px-3 py-2 text-gray-900 font-mono text-sm"
              />
              <Button
                type="button"
                onClick={copyUrl}
                variant="outline"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                📋 Copiar
              </Button>
            </div>
            <p className="mt-2 text-xs text-blue-700">
              Use esta URL nos seus anúncios do Meta Ads, Google Ads, TikTok Ads, etc.
            </p>
          </div>
        )}

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
                Ativar Conversão Secundária (Tracking de Cliques no Funil)
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Gera uma URL especial para trackear quando visitantes clicam no botão/link da sua página (seja uma passagem de presell, advertorial, VSL ou página de produto)
              </p>
            </div>
          </div>

          {formData.enableSecondaryConversion && (
            <div className="ml-7 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de Destino <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required={formData.enableSecondaryConversion}
                  value={formData.checkoutUrl}
                  onChange={e => setFormData({...formData, checkoutUrl: e.target.value})}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 px-3 py-2 bg-white text-gray-900"
                  placeholder="meusite.com/proxima-pagina ou https://meusite.com/proxima-pagina"
                />
                <p className="mt-1 text-sm text-gray-500">
                  URL para onde o visitante será redirecionado após clicar no botão/link (pode ser com ou sem https://)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-3">📋 Como usar:</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-blue-800 mb-2">
                      1. Altere o botão/link que deseja rastrear na sua estrutura para apontar para:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded text-blue-900 font-mono text-sm">
                        {conversionUrl || `https://seu-dominio.com/c/${formData.slug || 'seu-slug'}`}
                      </code>
                      {conversionUrl && (
                        <button
                          type="button"
                          onClick={copyConversionUrl}
                          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                        >
                          📋 Copiar
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-blue-800">
                    2. Quando o visitante clicar, será registrada a conversão secundária
                  </p>
                  <p className="text-sm text-blue-800">
                    3. Em seguida, o visitante será redirecionado automaticamente para a URL de destino configurada acima
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ✅ SCRIPT DE TRACKING: Injetado automaticamente pelo Worker! */}
        <div className="border-t pt-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              ✅ Tracking Automático Ativado!
            </h4>
            <p className="text-sm text-blue-800">
              O script de tracking é <strong>injetado automaticamente</strong> pelo Cloudflare Worker em todas as variações desta campanha. Você <strong>não precisa</strong> adicionar nenhum código manualmente nas suas páginas! 🎉
            </p>
          </div>
        </div>

        <Button type="submit" disabled={loading || !isWeightValid} className="w-full">
          {loading ? 'Criando...' : isWeightValid ? 'Criar Campanha' : 'Ajuste as porcentagens (total deve ser 100%)'}
        </Button>
      </form>
    </div>
  );
}
