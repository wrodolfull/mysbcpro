"use client";

import { PageHeader } from '@mysbc/ui';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select } from '../../../components/ui/select';
import { useOrganizationContext } from '../../../contexts/OrganizationContext';

interface InboundDTO {
  id?: string;
  organizationId: string;
  name: string;
  didOrUri: string;
  callerIdNumber?: string;
  networkAddr?: string;
  context: 'public' | 'default';
  priority: number;
  matchRules?: Record<string, unknown> | null;
  targetFlowId?: string | null;
  enabled: boolean;
}

export default function InboundsPage() {
  const [inbounds, setInbounds] = useState<InboundDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingInbound, setEditingInbound] = useState<InboundDTO | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Get dynamic organization ID from context
  const { organizationId, loading: orgLoading, error: orgError } = useOrganizationContext();

  useEffect(() => {
    if (organizationId && !orgLoading) {
      loadInbounds();
    }
  }, [organizationId, orgLoading]);

  const loadInbounds = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/inbounds/${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setInbounds(data);
      } else {
        console.error('Error loading inbounds:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading inbounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveInbound = async (inbound: InboundDTO) => {
    if (!organizationId) return;
    
    try {
      const url = inbound.id 
        ? `http://localhost:4000/inbounds/${organizationId}/${inbound.id}`
        : `http://localhost:4000/inbounds/${organizationId}`;
      
      const response = await fetch(url, {
        method: inbound.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inbound)
      });
      
      if (response.ok) {
        await loadInbounds();
        setShowForm(false);
        setEditingInbound(null);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error saving inbound:', errorData);
        alert(`Error saving inbound: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving inbound:', error);
      alert('Error saving inbound: Network error');
    }
  };

  const publishInbound = async (id: string) => {
    if (!organizationId) return;
    
    try {
      const response = await fetch(`http://localhost:4000/inbounds/${organizationId}/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        alert('Inbound connector publicado com sucesso!');
        await loadInbounds();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error publishing inbound:', errorData);
        alert(`Erro ao publicar inbound connector: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error publishing inbound:', error);
      alert('Erro ao publicar inbound connector');
    }
  };

  const testInbound = async (id: string) => {
    if (!organizationId) return;
    
    try {
      const response = await fetch(`http://localhost:4000/inbounds/${organizationId}/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          alert('Teste de roteamento: Sucesso');
        } else {
          const warnings = result.details?.routing?.warnings || [];
          if (warnings.length > 0) {
            alert(`Teste de roteamento: Avisos\n${warnings.join('\n')}`);
          } else {
            alert('Teste de roteamento: Falhou');
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error testing inbound:', errorData);
        alert(`Erro ao testar inbound connector: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error testing inbound:', error);
      alert('Erro ao testar inbound connector');
    }
  };

  const deleteInbound = async (id: string) => {
    if (!organizationId) return;
    if (!confirm('Tem certeza que deseja deletar este inbound connector?')) return;
    
    try {
      const response = await fetch(`http://localhost:4000/inbounds/${organizationId}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await loadInbounds();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error deleting inbound:', errorData);
        alert(`Erro ao deletar inbound connector: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting inbound:', error);
      alert('Erro ao deletar inbound connector');
    }
  };

  const openCreateForm = () => {
    if (!organizationId) return;
    
    setEditingInbound({
      organizationId,
      name: '',
      didOrUri: '',
      context: 'public',
      priority: 100,
      enabled: true
    });
    setShowForm(true);
  };

  const openEditForm = (inbound: InboundDTO) => {
    setEditingInbound(inbound);
    setShowForm(true);
  };

  // Show loading state while getting organization
  if (orgLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inbound Connector" />
        <div className="text-center py-8">Carregando organização...</div>
      </div>
    );
  }

  // Show error state if there's an organization error
  if (orgError || !organizationId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inbound Connector" />
        <div className="text-center py-8 text-red-600">
          Erro: {orgError || 'Organização não encontrada'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Inbound Connector" 
        actions={
          <Button onClick={openCreateForm}>
            + Novo Inbound
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Conectores de Entrada</CardTitle>
            <CardDescription>
              Configure números DID e URIs para receber chamadas externas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DID/URI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contexto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inbounds.map((inbound) => (
                    <tr key={inbound.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {inbound.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {inbound.didOrUri}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {inbound.context}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {inbound.priority}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          inbound.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {inbound.enabled ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditForm(inbound)}
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => publishInbound(inbound.id!)}
                          >
                            Publicar
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => testInbound(inbound.id!)}
                          >
                            Testar
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteInbound(inbound.id!)}
                          >
                            Deletar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {inbounds.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum inbound connector configurado. Clique em "Novo Inbound" para começar.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && editingInbound && (
        <InboundForm 
          inbound={editingInbound}
          onSave={saveInbound}
          onCancel={() => {
            setShowForm(false);
            setEditingInbound(null);
          }}
        />
      )}
    </div>
  );
}

function InboundForm({ 
  inbound, 
  onSave, 
  onCancel 
}: { 
  inbound: InboundDTO;
  onSave: (inbound: InboundDTO) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<InboundDTO>(inbound);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = (field: keyof InboundDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {inbound.id ? 'Editar Inbound Connector' : 'Novo Inbound Connector'}
          </CardTitle>
          <CardDescription>
            Configure como chamadas de entrada serão roteadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Ex: atendimento-principal"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="didOrUri">DID/URI *</Label>
                <Input
                  id="didOrUri"
                  type="text"
                  required
                  value={formData.didOrUri}
                  onChange={(e) => updateField('didOrUri', e.target.value)}
                  placeholder="Ex: +5511999999999 ou atendimento@empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="context">Contexto *</Label>
                <Select
                  value={formData.context}
                  onChange={(e) => updateField('context', e.target.value as 'public' | 'default')}
                >
                  <option value="public">Public</option>
                  <option value="default">Default</option>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => updateField('priority', parseInt(e.target.value))}
                  min="1"
                  max="999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="callerIdNumber">Caller ID</Label>
                <Input
                  id="callerIdNumber"
                  type="text"
                  value={formData.callerIdNumber || ''}
                  onChange={(e) => updateField('callerIdNumber', e.target.value)}
                  placeholder="Ex: +5511999999999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="networkAddr">Endereço de Rede</Label>
              <Input
                id="networkAddr"
                type="text"
                value={formData.networkAddr || ''}
                onChange={(e) => updateField('networkAddr', e.target.value)}
                placeholder="Ex: 192.168.1.0/24"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetFlowId">Flow de Destino</Label>
              <Input
                id="targetFlowId"
                type="text"
                value={formData.targetFlowId || ''}
                onChange={(e) => updateField('targetFlowId', e.target.value)}
                placeholder="ID do flow publicado"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => updateField('enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Label htmlFor="enabled">Connector ativo</Label>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="default"
              >
                Salvar e Publicar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

