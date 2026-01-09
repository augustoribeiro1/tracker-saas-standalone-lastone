'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Edit2, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AccountPage() {
  const { data: session, update: updateSession } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Estados para Tracking Params
  const [trackingParamPrimary, setTrackingParamPrimary] = useState('');
  const [trackingParamBackup, setTrackingParamBackup] = useState('');
  const [trackingConfirmation, setTrackingConfirmation] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUpdateTrackingParams = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingMessage(null);

    if (!trackingParamPrimary || !trackingParamBackup) {
      setTrackingMessage({ type: 'error', text: 'Preencha ambos os parâmetros' });
      return;
    }

    if (trackingConfirmation !== 'alterar') {
      setTrackingMessage({ type: 'error', text: 'Digite "alterar" para confirmar' });
      return;
    }

    setTrackingLoading(true);

    try {
      const res = await fetch('/api/account/update-tracking-params', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingParamPrimary,
          trackingParamBackup,
          confirmation: trackingConfirmation
        })
      });

      const data = await res.json();

      if (res.ok) {
        setTrackingMessage({ type: 'success', text: 'Parâmetros atualizados com sucesso!' });
        setTrackingConfirmation('');

        // ✅ Atualizar sessão do NextAuth
        await updateSession();

        setTimeout(() => {
          setDialogOpen(false);
          setTrackingMessage(null);
        }, 1500);
      } else {
        setTrackingMessage({ type: 'error', text: data.error || 'Erro ao atualizar parâmetros' });
      }
    } catch (error) {
      setTrackingMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Preencha todos os campos' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/account/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar senha' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Minha Conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie suas informações pessoais e segurança
        </p>
      </div>

      {/* Informações do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <div className="px-3 py-2 bg-muted rounded-md">
              {session?.user?.name || 'Não informado'}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="px-3 py-2 bg-muted rounded-md">
              {session?.user?.email}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Plano Atual</Label>
            <div>
              <Badge>
                {session?.user?.plan || 'free'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <div className={`mb-4 flex items-center gap-2 rounded-md p-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-200'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Atualizando...' : 'Atualizar Senha'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Parâmetros de Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros de Tracking</CardTitle>
          <CardDescription>
            Escolha em quais parâmetros o clickId dos seus visitantes será injetado nos links das páginas variantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Estes parâmetros são aplicados automaticamente em todos os links e botões das suas páginas variantes.
                  Altere-os de acordo com a compatibilidade do seu checkout ou plataforma.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Parâmetro primário:</span>
                    <Badge variant="secondary" className="font-mono">
                      {(session?.user as any)?.trackingParamPrimary || 'utm_term'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Parâmetro backup:</span>
                    <Badge variant="secondary" className="font-mono">
                      {(session?.user as any)?.trackingParamBackup || 'subid'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setTrackingParamPrimary((session?.user as any)?.trackingParamPrimary || 'utm_term');
                  setTrackingParamBackup((session?.user as any)?.trackingParamBackup || 'subid');
                  setTrackingConfirmation('');
                  setTrackingMessage(null);
                }}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Editar Parâmetros
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Parâmetros de Tracking</DialogTitle>
                <DialogDescription>
                  Configure os parâmetros onde o clickId será injetado. Use apenas letras, números e underscore (_).
                </DialogDescription>
              </DialogHeader>

              {trackingMessage && (
                <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                  trackingMessage.type === 'success'
                    ? 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-200'
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {trackingMessage.type === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>{trackingMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdateTrackingParams} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="trackingParamPrimary">Parâmetro Primário</Label>
                  <Input
                    id="trackingParamPrimary"
                    type="text"
                    value={trackingParamPrimary}
                    onChange={(e) => setTrackingParamPrimary(e.target.value.toLowerCase())}
                    placeholder="utm_term"
                    required
                    pattern="[a-zA-Z0-9_]+"
                    title="Apenas letras, números e underscore"
                  />
                  <p className="text-xs text-muted-foreground">
                    Exemplo: utm_term, param1, click_id
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trackingParamBackup">Parâmetro Backup</Label>
                  <Input
                    id="trackingParamBackup"
                    type="text"
                    value={trackingParamBackup}
                    onChange={(e) => setTrackingParamBackup(e.target.value.toLowerCase())}
                    placeholder="subid"
                    required
                    pattern="[a-zA-Z0-9_]+"
                    title="Apenas letras, números e underscore"
                  />
                  <p className="text-xs text-muted-foreground">
                    Exemplo: subid, param2, backup_id
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trackingConfirmation">Confirmação</Label>
                  <Input
                    id="trackingConfirmation"
                    type="text"
                    value={trackingConfirmation}
                    onChange={(e) => setTrackingConfirmation(e.target.value)}
                    placeholder='Digite "alterar" para confirmar'
                    required
                  />
                  <p className="text-xs text-destructive">
                    ⚠️ Esta alteração afetará todas as suas campanhas
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={trackingLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={trackingLoading}>
                    {trackingLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
