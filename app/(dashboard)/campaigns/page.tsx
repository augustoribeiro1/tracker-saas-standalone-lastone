'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPlanLimits, planNameToId } from '@/lib/plan-limits';
import { PlanLimitReached } from '@/components/PlanLimitReached';
import { Copy, Edit, BarChart3, Trash2 } from 'lucide-react';

export default function CampaignsPage() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tradução de status
  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      'active': 'Ativa',
      'paused': 'Pausada',
      'archived': 'Arquivada',
      'draft': 'Rascunho'
    };
    return translations[status] || status;
  };

  // Badge variant por status
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'active': 'default',
      'paused': 'secondary',
      'archived': 'outline',
      'draft': 'outline'
    };
    return variants[status] || 'outline';
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = () => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(data => {
        setCampaigns(data.campaigns || []);
        setLoading(false);
      });
  };
 
  const deleteCampaign = async (id: number, name: string) => {
    if (!confirm(`Tem certeza que deseja deletar a campanha "${name}"? Todos os dados serão perdidos!`)) {
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Campanha deletada com sucesso!');
        fetchCampaigns();
      } else {
        alert('Erro ao deletar campanha');
      }
    } catch (error) {
      alert('Erro ao deletar campanha');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg text-muted-foreground">Carregando campanhas...</div>
    </div>
  );

  // ✅ VERIFICAR LIMITE DE CAMPANHAS
  const userPlan = session?.user?.plan || 'free';
  const planId = planNameToId(userPlan);
  const limits = getPlanLimits(planId);
  const canAddCampaign = campaigns.length < limits.campaigns;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">
            Gerencie suas campanhas de split testing
          </p>
        </div>
        {canAddCampaign && (
          <Link href="/campaigns/new">
            <Button>Nova Campanha</Button>
          </Link>
        )}
      </div>

      {/* ✅ ALERTA DE LIMITE ATINGIDO */}
      {!canAddCampaign && (
        <PlanLimitReached
          resource="campanhas"
          current={campaigns.length}
          max={limits.campaigns}
          planName={limits.name}
          upgradeMessage={limits.upgradeMessage}
        />
      )}

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma campanha ainda</p>
            {canAddCampaign && (
              <Link href="/campaigns/new">
                <Button>Criar Primeira Campanha</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      URL Completo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((c: any) => {
                    const fullUrl = c.customDomain
                      ? `https://${c.customDomain.domain}/r/${c.slug}`
                      : `/r/${c.slug}`;

                    return (
                      <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{c.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {fullUrl}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                navigator.clipboard.writeText(fullUrl.startsWith('http') ? fullUrl : `https://${window.location.host}${fullUrl}`);
                                alert('URL copiado!');
                              }}
                              title="Copiar URL"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusVariant(c.status)}>
                            {translateStatus(c.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/campaigns/${c.id}/edit`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Edit className="h-3 w-3" />
                                Editar
                              </Button>
                            </Link>
                            <Link href={`/campaigns/${c.id}`}>
                              <Button variant="ghost" size="sm" className="gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                                <BarChart3 className="h-3 w-3" />
                                Analytics
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-destructive hover:text-destructive"
                              onClick={() => deleteCampaign(c.id, c.name)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Deletar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}