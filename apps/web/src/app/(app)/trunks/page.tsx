"use client";
import { PageHeader } from '@mysbc/ui';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select } from '../../../components/ui/select';
import { useOrganizationContext } from '../../../contexts/OrganizationContext';
import { getSupabaseClient } from '../../../lib/supabase/client';

type Transport = 'udp' | 'tcp' | 'tls';
type SrtpMode = 'optional' | 'required' | 'off';
type DtmfMode = 'rfc2833' | 'inband' | 'info';

interface TrunkDTO {
  id?: string;
  organizationId: string;
  name: string;
  host: string;
  enabled: boolean;
  username?: string;
  secret?: string;
  transport?: Transport;
  srtp?: SrtpMode;
  proxy?: string;
  registrar?: string;
  expires?: number;
  codecs?: string[];
  dtmfMode?: DtmfMode;
}

export default function TrunksPage() {
  const [trunks, setTrunks] = useState<TrunkDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTrunk, setEditingTrunk] = useState<TrunkDTO | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Get dynamic organization ID from context
  const { organizationId, loading: orgLoading, error: orgError } = useOrganizationContext();

  // Helper function to get authenticated headers
  const getAuthHeaders = async () => {
    const supabase = getSupabaseClient();
    const session = await supabase.auth.getSession();
    return {
      'Authorization': `Bearer ${session.data.session?.access_token}`,
      'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    if (organizationId && !orgLoading) {
      loadTrunks();
    }
  }, [organizationId, orgLoading]);

  const loadTrunks = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`http://localhost:4000/trunks/${organizationId}`, {
        headers
      });
      if (response.ok) {
        const data = await response.json();
        setTrunks(data);
      } else {
        console.error('Error loading trunks:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading trunks:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTrunk = async (trunk: TrunkDTO) => {
    try {
      // Determine if this is a create or update operation
      const isUpdate = trunk.id && trunk.id.trim() !== '';
      const headers = await getAuthHeaders();
      
      let response;
      if (isUpdate) {
        // Update existing trunk
        const { id, organizationId, ...updateData } = trunk;
        response = await fetch(`http://localhost:4000/trunks/${organizationId}/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updateData)
        });
      } else {
        // Create new trunk
        const { id, ...createData } = trunk;
        response = await fetch(`http://localhost:4000/trunks/${organizationId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(createData)
        });
      }
      
      if (response.ok) {
        await loadTrunks();
        setShowForm(false);
        setEditingTrunk(null);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error saving trunk:', errorData);
        alert(`Error saving trunk: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving trunk:', error);
      alert('Error saving trunk: Network error');
    }
  };

  const deleteTrunk = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este trunk?')) return;
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`http://localhost:4000/trunks/${organizationId}/${id}`, {
        method: 'DELETE',
        headers
      });
      
      if (response.ok) {
        await loadTrunks();
      } else {
        console.error('Error deleting trunk:', response.statusText);
        alert('Error deleting trunk');
      }
    } catch (error) {
      console.error('Error deleting trunk:', error);
      alert('Error deleting trunk');
    }
  };

  const publishTrunk = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`http://localhost:4000/trunks/${organizationId}/${id}/publish`, {
        method: 'POST',
        headers
      });
      
      if (response.ok) {
        alert('Trunk publicado com sucesso!');
        await loadTrunks();
      } else {
        console.error('Error publishing trunk:', response.statusText);
        alert('Erro ao publicar trunk');
      }
    } catch (error) {
      console.error('Error publishing trunk:', error);
      alert('Erro ao publicar trunk');
    }
  };

  const testTrunk = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`http://localhost:4000/trunks/${organizationId}/${id}/test`, {
        method: 'POST',
        headers
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Teste de conectividade: ${result.ok ? 'Sucesso' : 'Falhou'}`);
      } else {
        console.error('Error testing trunk:', response.statusText);
        alert('Erro ao testar trunk');
      }
    } catch (error) {
      console.error('Error testing trunk:', error);
      alert('Erro ao testar trunk');
    }
  };

  const openCreateForm = () => {
    setEditingTrunk({
      organizationId: organizationId,
      name: '',
      host: '',
      enabled: true,
      transport: 'udp',
      srtp: 'off',
      dtmfMode: 'rfc2833',
      expires: 300,
      codecs: ['PCMU', 'PCMA'],
      register: true,
      retrySeconds: 30,
      ping: 25,
      callerIdInFrom: false
    });
    setShowForm(true);
  };

  const openEditForm = (trunk: TrunkDTO) => {
    setEditingTrunk(trunk);
    setShowForm(true);
  };

  // Show loading state while getting organization
  if (orgLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="SIP Trunk Connector" />
        <div className="text-center py-8">Carregando organização...</div>
      </div>
    );
  }

  // Show error state if there's an organization error
  if (orgError || !organizationId) {
    return (
      <div className="space-y-6">
        <PageHeader title="SIP Trunk Connector" />
        <div className="text-center py-8 text-red-600">
          Erro: {orgError || 'Organização não encontrada'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="SIP Trunk Connector" 
        actions={
          <button 
            onClick={openCreateForm}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Novo Trunk
          </button>
        }
      />

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Host</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transport</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trunks.map((trunk) => (
                  <tr key={trunk.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trunk.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trunk.host}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trunk.transport?.toUpperCase() || 'UDP'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        trunk.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {trunk.enabled ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditForm(trunk)}
                        >
                          Editar
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => publishTrunk(trunk.id!)}
                        >
                          Publicar
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => testTrunk(trunk.id!)}
                        >
                          Testar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => deleteTrunk(trunk.id!)}
                        >
                          Deletar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {trunks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum trunk configurado. Clique em "Novo Trunk" para começar.
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && editingTrunk && (
        <TrunkForm 
          trunk={editingTrunk}
          onSave={saveTrunk}
          onCancel={() => {
            setShowForm(false);
            setEditingTrunk(null);
          }}
        />
      )}
    </div>
  );
}

function TrunkForm({ 
  trunk, 
  onSave, 
  onCancel 
}: { 
  trunk: TrunkDTO;
  onSave: (trunk: TrunkDTO) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<TrunkDTO>(trunk);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = (field: keyof TrunkDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {trunk.id ? 'Editar Trunk' : 'Novo Trunk'}
          </CardTitle>
          <CardDescription>
            Configure as informações do SIP Trunk para conectar com seu provedor
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
                  placeholder="Ex: provider-trunk-01"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="host">Host *</Label>
                <Input
                  id="host"
                  type="text"
                  required
                  value={formData.host}
                  onChange={(e) => updateField('host', e.target.value)}
                  placeholder="Ex: sip.provider.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => updateField('username', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret
                </label>
                <input
                  type="password"
                  value={formData.secret || ''}
                  onChange={(e) => updateField('secret', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transport
                </label>
                <select
                  value={formData.transport || 'udp'}
                  onChange={(e) => updateField('transport', e.target.value as Transport)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="udp">UDP</option>
                  <option value="tcp">TCP</option>
                  <option value="tls">TLS</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SRTP
                </label>
                <select
                  value={formData.srtp || 'off'}
                  onChange={(e) => updateField('srtp', e.target.value as SrtpMode)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="off">Off</option>
                  <option value="optional">Optional</option>
                  <option value="required">Required</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DTMF Mode
                </label>
                <select
                  value={formData.dtmfMode || 'rfc2833'}
                  onChange={(e) => updateField('dtmfMode', e.target.value as DtmfMode)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rfc2833">RFC2833</option>
                  <option value="inband">Inband</option>
                  <option value="info">INFO</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proxy
                </label>
                <input
                  type="text"
                  value={formData.proxy || ''}
                  onChange={(e) => updateField('proxy', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: proxy.provider.com:5060"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registrar
                </label>
                <select
                  value={formData.register !== undefined ? formData.register.toString() : 'true'}
                  onChange={(e) => updateField('register', e.target.value === 'true')}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registrar Proxy
                </label>
                <input
                  type="text"
                  value={formData.registrar || ''}
                  onChange={(e) => updateField('registrar', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: registrar.provider.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Realm
                </label>
                <input
                  type="text"
                  value={formData.realm || ''}
                  onChange={(e) => updateField('realm', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: provider.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From User
                </label>
                <input
                  type="text"
                  value={formData.fromUser || ''}
                  onChange={(e) => updateField('fromUser', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Domain
                </label>
                <input
                  type="text"
                  value={formData.fromDomain || ''}
                  onChange={(e) => updateField('fromDomain', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: provider.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extension
                </label>
                <input
                  type="text"
                  value={formData.extension || ''}
                  onChange={(e) => updateField('extension', e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 1000 ou auto_to_user"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires (segundos)
                </label>
                <input
                  type="number"
                  value={formData.expires || 300}
                  onChange={(e) => updateField('expires', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="60"
                  max="3600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retry Seconds
                </label>
                <input
                  type="number"
                  value={formData.retrySeconds || 30}
                  onChange={(e) => updateField('retrySeconds', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="10"
                  max="300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ping (segundos)
                </label>
                <input
                  type="number"
                  value={formData.ping || 25}
                  onChange={(e) => updateField('ping', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="10"
                  max="300"
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => updateField('enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                  Trunk ativo
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="callerIdInFrom"
                  checked={formData.callerIdInFrom || false}
                  onChange={(e) => updateField('callerIdInFrom', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="callerIdInFrom" className="ml-2 block text-sm text-gray-900">
                  Caller ID no From
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Params
              </label>
              <input
                type="text"
                value={formData.contactParams || ''}
                onChange={(e) => updateField('contactParams', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: tport=tcp"
              />
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

