"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface DashboardStats {
  trunks: { total: number; active: number };
  inbounds: { total: number; active: number };
  flows: { total: number; published: number };
  events: { total: number; recent: any[] };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento de dados - em produção, viria da API
    setTimeout(() => {
      setStats({
        trunks: { total: 3, active: 2 },
        inbounds: { total: 5, active: 4 },
        flows: { total: 8, published: 6 },
        events: { 
          total: 156, 
          recent: [
            { id: 1, type: 'trunk_published', message: 'Trunk "Operadora-1" publicado', time: '2 min atrás' },
            { id: 2, type: 'flow_executed', message: 'Flow "Atendimento" executado', time: '5 min atrás' },
            { id: 3, type: 'csat_response', message: 'Nova resposta CSAT recebida', time: '10 min atrás' }
          ]
        }
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button variant="outline">
          Atualizar
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SIP Trunks</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.trunks.active}/{stats?.trunks.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.trunks.active} ativos de {stats?.trunks.total} configurados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inbound Connectors</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inbounds.active}/{stats?.inbounds.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.inbounds.active} ativos de {stats?.inbounds.total} configurados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integration Flows</CardTitle>
            <div className="h-4 w-4 rounded-full bg-purple-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.flows.published}/{stats?.flows.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.flows.published} publicados de {stats?.flows.total} criados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Hoje</CardTitle>
            <div className="h-4 w-4 rounded-full bg-orange-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.events.total}</div>
            <p className="text-xs text-muted-foreground">
              Execuções e eventos do sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de eventos recentes e status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Eventos Recentes</CardTitle>
            <CardDescription>
              Últimas atividades do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.events.recent.map((event) => (
              <div key={event.id} className="flex items-center space-x-4">
                <div className={`h-2 w-2 rounded-full ${
                  event.type === 'trunk_published' ? 'bg-green-500' :
                  event.type === 'flow_executed' ? 'bg-blue-500' :
                  'bg-orange-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{event.message}</p>
                  <p className="text-xs text-muted-foreground">{event.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
            <CardDescription>
              Saúde dos componentes principais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">FreeSWITCH Engine</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-green-600">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Base de Dados</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-green-600">Conectado</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API Backend</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-green-600">Operacional</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Quotas TTS</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-yellow-600">2.150/3.000 usados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso direto às funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <span className="text-xs">Novo Trunk</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l4-4m0 0l4-4m-4 4l-4-4m4 4l4 4" />
              </svg>
              <span className="text-xs">Novo Inbound</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs">Novo Flow</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">Nova Pesquisa</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

