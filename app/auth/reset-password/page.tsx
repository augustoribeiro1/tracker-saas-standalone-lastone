'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage({
        type: 'error',
        text: 'Token de reset inválido ou ausente'
      });
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validações
    if (!password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Preencha todos os campos' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password
        })
      });

      const data = await res.json();

      if (res.ok) {
        setResetSuccess(true);
        setMessage({
          type: 'success',
          text: 'Senha alterada com sucesso! Redirecionando para o login...'
        });

        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao resetar senha. Token pode ter expirado.'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro ao conectar com o servidor'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <img
            src="/logo.png"
            alt="Split2"
            width="180"
            height="65"
            className="mb-6"
            style={{ maxWidth: '180px', height: 'auto' }}
          />
          <h2 className="mt-2 text-center text-2xl font-bold text-gray-900">
            Criar Nova Senha
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Digite sua nova senha abaixo
          </p>
        </div>

        {!resetSuccess ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {message && (
              <div className={`rounded-md p-4 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-500 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  disabled={!token || loading}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-500 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Digite a senha novamente"
                  disabled={!token || loading}
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={!token || loading}
                className="w-full"
              >
                {loading ? 'Atualizando...' : 'Atualizar Senha'}
              </Button>
            </div>

            <div className="text-center text-sm">
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                Voltar para o login
              </Link>
            </div>
          </form>
        ) : (
          <div className="mt-8">
            <div className="rounded-md bg-green-50 border border-green-200 p-4">
              <div className="flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="text-sm text-green-800 font-medium">
                  Senha alterada com sucesso!
                </div>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-600">
              Redirecionando para o login...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
