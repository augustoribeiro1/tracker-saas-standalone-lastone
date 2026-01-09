'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Script from 'next/script';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaWidgetId = useRef<number | null>(null);

  useEffect(() => {
    if (recaptchaLoaded && recaptchaRef.current && !recaptchaWidgetId.current) {
      try {
        recaptchaWidgetId.current = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: '6LfN3EQsAAAAAA6mWfm8xdn4TQFiCx6_GA55i43X',
          theme: 'light',
        });
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
      }
    }
  }, [recaptchaLoaded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar reCAPTCHA
    if (!window.grecaptcha || recaptchaWidgetId.current === null) {
      setError('Por favor, aguarde o carregamento do reCAPTCHA');
      return;
    }

    const recaptchaResponse = window.grecaptcha.getResponse(recaptchaWidgetId.current);
    if (!recaptchaResponse) {
      setError('Por favor, complete a verificação do reCAPTCHA');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Email ou senha inválidos');
        // Reset reCAPTCHA
        if (recaptchaWidgetId.current !== null) {
          window.grecaptcha.reset(recaptchaWidgetId.current);
        }
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setError('Erro ao fazer login');
      // Reset reCAPTCHA
      if (recaptchaWidgetId.current !== null) {
        window.grecaptcha.reset(recaptchaWidgetId.current);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit"
        strategy="lazyOnload"
        onLoad={() => setRecaptchaLoaded(true)}
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="flex flex-col items-center">
            {/* ✅ LOGO COM <img> NATIVO (sem Next/Image) */}
            <img
              src="/logo.png"
              alt="Split2"
              width="180"
              height="65"
              className="mb-6"
              style={{ maxWidth: '180px', height: 'auto' }}
            />
            <p className="mt-2 text-center text-sm text-gray-600">
              Faça login na sua conta
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-500 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Senha</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-500 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Senha"
                />
              </div>
            </div>

            {/* reCAPTCHA */}
            <div className="flex justify-center">
              <div ref={recaptchaRef}></div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-center text-sm">
                <Link href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="text-center text-sm">
                <span className="text-gray-600">Não tem uma conta? </span>
                <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                  Criar conta
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
