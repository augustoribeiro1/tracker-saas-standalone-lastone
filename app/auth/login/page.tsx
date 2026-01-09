'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
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
      // Aguardar um pouco para garantir que window.grecaptcha.render está disponível
      const timer = setTimeout(() => {
        try {
          if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
            recaptchaWidgetId.current = window.grecaptcha.render(recaptchaRef.current, {
              sitekey: '6LfN3EQsAAAAAA6mWfm8xdn4TQFiCx6_GA55i43X',
              theme: 'light',
            });
          }
        } catch (error) {
          console.error('Error rendering reCAPTCHA:', error);
        }
      }, 500);

      return () => clearTimeout(timer);
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
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="lazyOnload"
        onLoad={() => setRecaptchaLoaded(true)}
      />
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 flex flex-col items-center">
            <img
              src="/logo.png"
              alt="Split2"
              width="180"
              height="65"
              className="h-16 w-auto"
              style={{ maxWidth: '180px', height: 'auto' }}
            />
            <div className="space-y-2 text-center">
              <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
              <CardDescription>
                Faça login na sua conta para continuar
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* reCAPTCHA */}
              <div className="flex justify-center">
                <div ref={recaptchaRef}></div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <div className="space-y-2">
                <div className="text-center text-sm">
                  <Link href="/auth/forgot-password" className="text-primary hover:underline">
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Não tem uma conta?{' '}
                  <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                    Criar conta
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
