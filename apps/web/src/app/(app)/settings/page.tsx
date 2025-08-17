"use client";

import { PageHeader } from '@mysbc/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select } from '../../../components/ui/select';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações do Tenant" />
      
      {/* Informações do Tenant */}
      <Card>
        <CardHeader>
          <CardTitle>🏢 Informações da Organização</CardTitle>
          <CardDescription>
            Configure os dados básicos da sua organização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Nome da Organização *</Label>
              <Input
                id="orgName"
                type="text"
                defaultValue="Empresa Exemplo LTDA"
                placeholder="Digite o nome da organização"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="orgDomain">Domínio</Label>
              <Input
                id="orgDomain"
                type="text"
                defaultValue="empresa-exemplo.com"
                placeholder="exemplo.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="orgEmail">Email de Contato</Label>
              <Input
                id="orgEmail"
                type="email"
                defaultValue="contato@empresa-exemplo.com"
                placeholder="contato@empresa.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="orgPhone">Telefone</Label>
              <Input
                id="orgPhone"
                type="tel"
                defaultValue="+55 11 99999-9999"
                placeholder="+55 11 99999-9999"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orgAddress">Endereço</Label>
            <Input
              id="orgAddress"
              type="text"
              defaultValue="Rua das Flores, 123 - São Paulo/SP"
              placeholder="Endereço completo"
            />
          </div>
          
          <div className="flex justify-end">
            <Button>Salvar Alterações</Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Comunicação */}
      <Card>
        <CardHeader>
          <CardTitle>📞 Configurações de Comunicação</CardTitle>
          <CardDescription>
            Configure parâmetros do FreeSWITCH e conectividade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eslHost">ESL Host</Label>
              <Input
                id="eslHost"
                type="text"
                defaultValue="localhost"
                placeholder="localhost"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eslPort">ESL Port</Label>
              <Input
                id="eslPort"
                type="number"
                defaultValue="8021"
                placeholder="8021"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="eslPassword">ESL Password</Label>
              <Input
                id="eslPassword"
                type="password"
                defaultValue="ClueCon"
                placeholder="Senha ESL"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="audioPath">Caminho dos Áudios</Label>
              <Input
                id="audioPath"
                type="text"
                defaultValue="/var/lib/freeswitch/recordings"
                placeholder="/caminho/para/audios"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button>Salvar Configurações</Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Quotas */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Configurações de Quotas</CardTitle>
          <CardDescription>
            Gerencie os limites de uso do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ttsQuota">Quota TTS (caracteres/mês)</Label>
              <Input
                id="ttsQuota"
                type="number"
                defaultValue="3000"
                placeholder="3000"
              />
              <p className="text-xs text-gray-500">
                Limite mensal de caracteres para Text-to-Speech
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="flowQuota">Quota de Flows (execuções/mês)</Label>
              <Input
                id="flowQuota"
                type="number"
                defaultValue="10000"
                placeholder="10000"
              />
              <p className="text-xs text-gray-500">
                Limite mensal de execuções de flows
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storageQuota">Quota de Storage (GB)</Label>
              <Input
                id="storageQuota"
                type="number"
                defaultValue="10"
                placeholder="10"
              />
              <p className="text-xs text-gray-500">
                Limite de armazenamento para arquivos de áudio
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="concurrentCalls">Chamadas Simultâneas</Label>
              <Input
                id="concurrentCalls"
                type="number"
                defaultValue="10000"
                placeholder="50"
              />
              <p className="text-xs text-gray-500">
                Número máximo de chamadas simultâneas
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button>Salvar Quotas</Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle>🔒 Configurações de Segurança</CardTitle>
          <CardDescription>
            Configure políticas de segurança e acesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ipWhitelist">IP Whitelist</Label>
              <Input
                id="ipWhitelist"
                type="text"
                defaultValue="192.168.1.0/24,10.0.0.0/8"
                placeholder="192.168.1.0/24,10.0.0.0/8"
              />
              <p className="text-xs text-gray-500">
                IPs permitidos para acesso ESL (separados por vírgula)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                defaultValue="30"
                placeholder="30"
              />
              <p className="text-xs text-gray-500">
                Tempo de inatividade para logout automático
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Tentativas de Login</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                defaultValue="5"
                placeholder="5"
              />
              <p className="text-xs text-gray-500">
                Máximo de tentativas antes do bloqueio
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="passwordPolicy">Política de Senha</Label>
              <Select defaultValue="strong">
                <option value="weak">Fraca (6+ caracteres)</option>
                <option value="medium">Média (8+ caracteres, números)</option>
                <option value="strong">Forte (10+ caracteres, números, símbolos)</option>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enable2FA"
              defaultChecked
              className="h-4 w-4 text-blue-600"
            />
            <Label htmlFor="enable2FA">Habilitar Autenticação de 2 Fatores</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableAuditLog"
              defaultChecked
              className="h-4 w-4 text-blue-600"
            />
            <Label htmlFor="enableAuditLog">Habilitar Log de Auditoria</Label>
          </div>
          
          <div className="flex justify-end">
            <Button>Salvar Segurança</Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Notificações */}
      <Card>
        <CardHeader>
          <CardTitle>🔔 Configurações de Notificações</CardTitle>
          <CardDescription>
            Configure como receber alertas e notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emailNotifications">Email para Notificações</Label>
              <Input
                id="emailNotifications"
                type="email"
                defaultValue="admin@empresa-exemplo.com"
                placeholder="admin@empresa.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook para Alertas</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://webhook.site/..."
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium">Tipos de Notificação</h4>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifyQuotaExceeded"
                defaultChecked
                className="h-4 w-4 text-blue-600"
              />
              <Label htmlFor="notifyQuotaExceeded">Quota excedida</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifySystemErrors"
                defaultChecked
                className="h-4 w-4 text-blue-600"
              />
              <Label htmlFor="notifySystemErrors">Erros do sistema</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifySecurityEvents"
                defaultChecked
                className="h-4 w-4 text-blue-600"
              />
              <Label htmlFor="notifySecurityEvents">Eventos de segurança</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifyMaintenance"
                className="h-4 w-4 text-blue-600"
              />
              <Label htmlFor="notifyMaintenance">Manutenção programada</Label>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button>Salvar Notificações</Button>
          </div>
        </CardContent>
      </Card>

      {/* Ações Perigosas */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">⚠️ Zona de Perigo</CardTitle>
          <CardDescription className="text-red-700">
            Ações que podem afetar o funcionamento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
              🔄 Resetar Configurações
            </Button>
            
            <Button variant="destructive">
              🗑️ Deletar Tenant
            </Button>
          </div>
          
          <p className="text-sm text-red-600">
            <strong>⚠️ Atenção:</strong> Estas ações são irreversíveis e podem resultar na perda de dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

