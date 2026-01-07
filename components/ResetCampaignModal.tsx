// /components/ResetCampaignModal.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ResetCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  campaignName: string;
}

export function ResetCampaignModal({ isOpen, onClose, onConfirm, campaignName }: ResetCampaignModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = confirmText === 'resetar campanha';

  const handleConfirm = async () => {
    if (!isValid) {
      setError('Digite exatamente: resetar campanha');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm();
      onClose();
      setConfirmText('');
    } catch (err) {
      setError('Erro ao resetar campanha');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-red-50 border-b-2 border-red-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
            ⚠️ Resetar Dados da Campanha
          </h3>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-sm text-yellow-800">
              <strong>ATENÇÃO:</strong> Esta ação é <strong>irreversível</strong>!
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              Você está prestes a apagar <strong>TODOS</strong> os dados da campanha:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
              <li>Todas as views (clicks)</li>
              <li>Todas as conversões secundárias</li>
              <li>Todas as compras registradas</li>
              <li>Toda a receita acumulada</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900 font-medium">
              Campanha: {campaignName}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Para confirmar, digite: <code className="bg-gray-100 px-2 py-1 rounded text-red-600">resetar campanha</code>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite aqui..."
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500"
              disabled={loading}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end rounded-b-lg">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Resetando...' : 'Resetar Campanha'}
          </Button>
        </div>
      </div>
    </div>
  );
}
