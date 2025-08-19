"use client";

import { PageHeader } from '@mysbc/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

interface IntegrationDTO {
  id: string;
  name: string;
  type: 'crm' | 'erp' | 'api' | 'webhook';
  status: 'active' | 'inactive' | 'error';
  lastSync?: string;
  description: string;
}

const mockIntegrations: IntegrationDTO[] = [
  {
    id: '1',
    name: 'Salesforce CRM',
    type: 'crm',
    status: 'active',
    lastSync: '2024-01-15T10:30:00Z',
    description: 'Integração com Salesforce para sincronização de clientes e oportunidades'
  },
  {
    id: '2',
    name: 'SAP ERP',
    type: 'erp',
    status: 'active',
    lastSync: '2024-01-15T09:15:00Z',
    description: 'Conexão com SAP para dados de produtos e estoque'
  },
  {
    id: '3',
    name: 'Webhook Genérico',
    type: 'webhook',
    status: 'inactive',
    description: 'Webhook para notificações externas'
  },
  {
    id: '4',
    name: 'API REST Custom',
    type: 'api',
    status: 'error',
    lastSync: '2024-01-14T16:45:00Z',
    description: 'API personalizada para sistema interno'
  }
];

export default function IntegrationsPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'inactive': return 'Inativa';
      case 'error': return 'Erro';
      default: return 'Desconhecido';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crm': return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
      case 'erp': return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
      case 'api': return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
      case 'webhook': return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
      default: return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Integrações" 
        actions={
          <Button>
            + Nova Integração
          </Button>
        }
      />

      {/* Cards de Status */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockIntegrations.length}</div>
            <p className="text-xs text-muted-foreground">
              Integrações configuradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockIntegrations.filter(i => i.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Funcionando normalmente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativas</CardTitle>
            <div className="h-4 w-4 rounded-full bg-gray-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockIntegrations.filter(i => i.status === 'inactive').length}
            </div>
            <p className="text-xs text-gray-500">
              Desabilitadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Erro</CardTitle>
            <div className="h-4 w-4 rounded-full bg-red-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockIntegrations.filter(i => i.status === 'error').length}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Integrações */}
      <Card>
        <CardHeader>
          <CardTitle>Integrações Configuradas</CardTitle>
          <CardDescription>
            Gerencie suas conexões com sistemas externos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockIntegrations.map((integration) => (
              <div key={integration.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{getTypeIcon(integration.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(integration.status)}`}>
                          {getStatusText(integration.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Tipo: {integration.type.toUpperCase()}</span>
                        <span>Última sincronização: {formatDate(integration.lastSync)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                    <Button variant="outline" size="sm">
                      Testar
                    </Button>
                    {integration.status === 'error' && (
                      <Button variant="destructive" size="sm">
                        Corrigir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tipos de Integração */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Integração Disponíveis</CardTitle>
          <CardDescription>
            Escolha o tipo de integração que melhor se adapta às suas necessidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border rounded p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="text-2xl">📊</div>
                <h4 className="font-semibold">CRM</h4>
              </div>
              <p className="text-sm text-gray-600">
                Sincronize dados de clientes, contatos e oportunidades com sistemas como Salesforce, HubSpot, etc.
              </p>
            </div>
            
            <div className="border rounded p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="text-2xl">🏢</div>
                <h4 className="font-semibold">ERP</h4>
              </div>
              <p className="text-sm text-gray-600">
                Conecte com sistemas empresariais para produtos, estoque, faturamento e mais.
              </p>
            </div>
            
            <div className="border rounded p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="text-2xl">🔌</div>
                <h4 className="font-semibold">API REST</h4>
              </div>
              <p className="text-sm text-gray-600">
                Integre com APIs personalizadas usando autenticação OAuth, chaves de API, etc.
              </p>
            </div>
            
            <div className="border rounded p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="text-2xl">🔗</div>
                <h4 className="font-semibold">Webhook</h4>
              </div>
              <p className="text-sm text-gray-600">
                Configure webhooks para notificações em tempo real e automações.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

