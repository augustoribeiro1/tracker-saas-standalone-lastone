'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    variations: [
      { name: 'Variação A', destinationUrl: '', weight: 50, isControl: true },
      { name: 'Variação B', destinationUrl: '', weight: 50, isControl: false }
    ]
  });

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

    try {
      // Normalizar URLs antes de enviar
      const normalizedData = {
        ...formData,
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

        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Variações</h3>
          {formData.variations.map((v, idx) => (
            <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
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
                className="block w-full mb-3 rounded-md border-2 border-gray-300 px-3 py-2 bg-white text-gray-900"
              />
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

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Criando...' : 'Criar Campanha'}
        </Button>
      </form>
    </div>
  );
}
