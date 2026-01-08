'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: 'success',
          text: 'Email enviado! Verifique sua caixa de entrada para resetar sua senha.'
        });
        setEmail('');
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao enviar email. Tente novamente.'
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
            Esqueci minha senha
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Digite seu email para receber o link de recuperação
          </p>
        </div>

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

          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-500 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Email"
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>
          </div>

          <div className="text-center text-sm">
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              Voltar para o login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
