'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ResetCampaignModal } from '@/components/ResetCampaignModal';
import { getPlanLimits, planNameToId } from '@/lib/plan-limits';

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [domains, setDomains] = useState<any[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [use3Variations, setUse3Variations] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    customDomainId: '',
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

  // Verificar se o usuário é PRO (pode usar 3 variações)
  const userPlan = session?.user?.plan || 'free';
  const planId = planNameToId(userPlan);
  const limits = getPlanLimits(planId);
  const isPro = planId === 3;
  const maxVariations = limits.variations;

  // ✅ AJUSTE 2: Gerar URL completo da campanha
  const selectedDomain = domains.find(d => d.id.toString() === formData.customDomainId);
  const fullUrl = selectedDomain && formData.slug
    ? `https://${selectedDomain.domain}/r/${formData.slug}`
    : '';

  // Gerar URL completo para conversão secundária
  const conversionUrl = selectedDomain && formData.slug
    ? `https://${selectedDomain.domain}/c/${formData.slug}`
    : '';

  // Copiar URL da campanha
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

  useEffect(() => {
    fetchCampaign();
    fetchDomains();
  }, []);

  // ✅ Buscar domínios (inclui domínio padrão do sistema)
  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/domains/list');
      const data = await res.json();
      // ✅ Filtrar apenas domínios com status 'active'
      const activeDomains = (data.domains || []).filter((d: any) => d.status === 'active');
      setDomains(activeDomains);
    } catch (error) {
      console.error('Erro ao carregar domínios:', error);
    }
  };

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${params.id}`);
      const data = await res.json();

      if (res.ok) {
        const variations = data.campaign.variations.map((v: any) => ({
          id: v.id,
          name: v.name,
          destinationUrl: v.destinationUrl,
          weight: v.weight
        }));

        setFormData({
          name: data.campaign.name,
          slug: data.campaign.slug,
          customDomainId: data.campaign.customDomainId?.toString() || '',
          enableSecondaryConversion: data.campaign.enableSecondaryConversion || false,
          checkoutUrl: data.campaign.checkoutUrl || '',
          variations
        });

        // Se a campanha tem 3 variações, marcar o checkbox
        setUse3Variations(variations.length === 3);
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

  // Handler para ativar/desativar 3 variações (apenas PRO)
  const handleToggle3Variations = (checked: boolean) => {
    setUse3Variations(checked);

    if (checked) {
      // Adicionar 3ª variação com distribuição igual (33.33% cada)
      const newWeight = Math.floor(100 / 3);
      const remainder = 100 - (newWeight * 3);

      setFormData({
        ...formData,
        variations: [
          { ...formData.variations[0], weight: newWeight + remainder },
          { ...formData.variations[1], weight: newWeight },
          { id: 0, name: 'Variação C', destinationUrl: '', weight: newWeight }
        ]
      });
    } else {
      // Remover 3ª variação e redistribuir para 50/50
      setFormData({
        ...formData,
        variations: [
          { ...formData.variations[0], weight: 50 },
          { ...formData.variations[1], weight: 50 }
        ]
      });
    }
  };

  // ✅ FUNÇÃO PARA RESETAR DADOS DA CAMPANHA
  const handleReset = async () => {
    try {
      console.log('[Reset] Sending request...');
      
      const res = await fetch(`/api/campaigns/${params.id}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmation: 'resetar campanha'
        })
      });

      console.log('[Reset] Response status:', res.status);
      console.log('[Reset] Response ok:', res.ok);

      // Verificar se resposta tem conteúdo
      const contentType = res.headers.get('content-type');
      console.log('[Reset] Content-Type:', contentType);

      let data;
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
          console.log('[Reset] Response data:', data);
        } catch (jsonError) {
          console.error('[Reset] Failed to parse JSON:', jsonError);
          throw new Error('Resposta inválida do servidor');
        }
      } else {
        const text = await res.text();
        console.log('[Reset] Response text:', text);
        throw new Error('Resposta não é JSON');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao resetar campanha');
      }

      alert(`✅ Campanha resetada com sucesso!\n\n${data.deleted.total} registros apagados:\n- ${data.deleted.clicks} views\n- ${data.deleted.events} eventos`);
      
      // Recarregar a página para atualizar contadores
      window.location.reload();
    } catch (err: any) {
      console.error('[Reset] Error:', err);
      alert(`❌ Erro ao resetar campanha: ${err.message}`);
      throw err;
    }
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slug (URL)
            {selectedDomain?.domain === 'app.split2.com.br' && (
              <span className="ml-2 text-xs text-gray-500">(Não editável em domínio padrão)</span>
            )}
          </label>
          <input
            type="text"
            required
            value={formData.slug}
            onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 px-3 py-2 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="black-friday"
            disabled={selectedDomain?.domain === 'app.split2.com.br'}
          />
          {selectedDomain?.domain === 'app.split2.com.br' && (
            <p className="mt-1 text-xs text-yellow-600">
              ⚠️ Slug contém prefixo de usuário e não pode ser editado para manter unicidade
            </p>
          )}
        </div>

        {/* Seletor de Domínio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Domínio de Tracking <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.customDomainId}
            onChange={e => setFormData({...formData, customDomainId: e.target.value})}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 px-3 py-2 bg-white text-gray-900"
          >
            {domains.map(domain => (
              <option key={domain.id} value={domain.id}>
                {domain.domain} {domain.isDefault ? '(Padrão)' : '✅'}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">
            {selectedDomain?.domain === 'app.split2.com.br'
              ? '💡 Domínio padrão do sistema - disponível para todos'
              : 'Domínio personalizado'
            }
          </p>
        </div>

        {/* ✅ AJUSTE 2: URL Completo com botão Copiar (AGORA VISÍVEL NO EDIT) */}
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

        {/* Checkbox para 3 variações (apenas PRO) */}
        {isPro && (
          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="use3Variations"
                checked={use3Variations}
                onChange={e => handleToggle3Variations(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div className="flex-1">
                <label htmlFor="use3Variations" className="block text-sm font-medium text-purple-900 cursor-pointer">
                  Quero testar 3 variações nessa campanha
                </label>
                <p className="text-sm text-purple-700 mt-1">
                  Como usuário PRO, você pode testar até 3 variações simultaneamente. Ao marcar esta opção, uma terceira variação será adicionada automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Variações */}
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

        {/* ⚠️ ZONA DE PERIGO: RESETAR DADOS */}
        <div className="border-t pt-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-900 mb-2 flex items-center gap-2">
              ⚠️ Zona de Perigo
            </h4>
            <p className="text-sm text-red-800 mb-3">
              Resetar os dados da campanha irá apagar <strong>permanentemente</strong> todas as views, conversões e compras registradas. Esta ação não pode ser desfeita.
            </p>
            <Button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              🗑️ Resetar Dados da Campanha
            </Button>
          </div>
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

      {/* ✅ MODAL DE CONFIRMAÇÃO DE RESET */}
      <ResetCampaignModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
        campaignName={formData.name}
      />
    </div>
  );
}
