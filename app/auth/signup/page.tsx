'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
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

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    // Validar reCAPTCHA
    if (!window.grecaptcha || recaptchaWidgetId.current === null) {
      setError('Por favor, aguarde o carregamento do reCAPTCHA');
      return;
    }

    const recaptchaToken = window.grecaptcha.getResponse(recaptchaWidgetId.current);
    if (!recaptchaToken) {
      setError('Por favor, complete a verificação do reCAPTCHA');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          recaptchaToken: recaptchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao criar conta');
        // Reset reCAPTCHA
        if (recaptchaWidgetId.current !== null) {
          window.grecaptcha.reset(recaptchaWidgetId.current);
        }
        return;
      }

      router.push('/auth/login?registered=true');
    } catch (error) {
      setError('Erro ao criar conta');
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
              <CardTitle className="text-2xl">Criar Conta</CardTitle>
              <CardDescription>
                Comece seu teste grátis
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
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                  {formData.password && (
                    <p className="text-xs text-muted-foreground">
                      {formData.password.length} caracteres digitados
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                  {formData.confirmPassword && (
                    <p className="text-xs text-muted-foreground">
                      {formData.confirmPassword.length} caracteres digitados
                    </p>
                  )}
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
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Fazer login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
