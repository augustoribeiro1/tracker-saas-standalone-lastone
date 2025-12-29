'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    variations: [
      { name: 'Variação A', destinationUrl: '', percentage: 50, isControl: true },
      { name: 'Variação B', destinationUrl: '', percentage: 50, isControl: false }
    ]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        router.push('/campaigns');
      }
    } catch (error) {
      alert('Erro ao criar campanha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-semibold mb-6">Nova Campanha</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome da Campanha</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Slug (URL)</label>
          <input
            type="text"
            required
            value={formData.slug}
            onChange={e => setFormData({...formData, slug: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            URL será: /r/{formData.slug}
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Variações</h3>
          {formData.variations.map((v, idx) => (
            <div key={idx} className="border rounded p-4">
              <input
                type="text"
                placeholder="Nome da variação"
                value={v.name}
                onChange={e => {
                  const newVars = [...formData.variations];
                  newVars[idx].name = e.target.value;
                  setFormData({...formData, variations: newVars});
                }}
                className="block w-full mb-2 rounded-md border-gray-300"
              />
              <input
                type="url"
                placeholder="URL de destino"
                required
                value={v.destinationUrl}
                onChange={e => {
                  const newVars = [...formData.variations];
                  newVars[idx].destinationUrl = e.target.value;
                  setFormData({...formData, variations: newVars});
                }}
                className="block w-full rounded-md border-gray-300"
              />
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
