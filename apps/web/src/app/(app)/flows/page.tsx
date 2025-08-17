"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@mysbc/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select } from '../../../components/ui/select';
import { useOrganizationContext } from '../../../contexts/OrganizationContext';
// CSS do React Flow será importado dinamicamente
import 'reactflow/dist/style.css';

const ReactFlow = dynamic(() => import('reactflow').then(m => m.ReactFlow), { ssr: false });
const Controls = dynamic(() => import('reactflow').then(m => m.Controls), { ssr: false });
const Background = dynamic(() => import('reactflow').then(m => m.Background), { ssr: false });
const MiniMap = dynamic(() => import('reactflow').then(m => m.MiniMap), { ssr: false });
// Import ReactFlow functions statically to avoid dynamic import issues
import { addEdge } from 'reactflow';

interface FlowDTO {
  id?: string;
  organizationId: string;
  name: string;
  status: 'draft' | 'published';
  version: number;
  graph: {
    nodes: any[];
    edges: any[];
  };
}

// Definição dos tipos de nós disponíveis
const nodeTypes = [
  { type: 'start', label: 'Start', category: 'Control', color: '#10b981' },
  { type: 'end', label: 'End', category: 'Control', color: '#ef4444' },
  { type: 'play_audio', label: 'Play Audio', category: 'Media', color: '#3b82f6' },
  { type: 'tts', label: 'TTS', category: 'Media', color: '#8b5cf6' },
  { type: 'ivr_capture', label: 'IVR Capture', category: 'Interaction', color: '#f59e0b' },
  { type: 'business_hours', label: 'Business Hours', category: 'Logic', color: '#06b6d4' },
  { type: 'record_call', label: 'Record Call', category: 'Media', color: '#84cc16' },
  { type: 'asr_stt', label: 'ASR/STT', category: 'AI', color: '#ec4899' },
  { type: 'crm_condition', label: 'CRM Condition', category: 'Integration', color: '#6366f1' },
  { type: 'http_request', label: 'HTTP Request', category: 'Integration', color: '#14b8a6' },
  { type: 'forward', label: 'Forward', category: 'Routing', color: '#f97316' },
  { type: 'queue', label: 'Queue', category: 'Routing', color: '#a855f7' },
  { type: 'voicemail', label: 'Voicemail', category: 'Routing', color: '#64748b' },
  { type: 'survey_csat', label: 'Survey CSAT', category: 'Analytics', color: '#eab308' },
  { type: 'wait', label: 'Wait', category: 'Control', color: '#059669' },
  { type: 'menu', label: 'Menu', category: 'Interaction', color: '#dc2626' },
  { type: 'condition', label: 'Condition', category: 'Logic', color: '#7c3aed' },
  { type: 'loop', label: 'Loop', category: 'Control', color: '#0891b2' },
  { type: 'database', label: 'Database', category: 'Integration', color: '#be185d' },
  { type: 'email', label: 'Email', category: 'Integration', color: '#0d9488' },
  { type: 'sms', label: 'SMS', category: 'Integration', color: '#c2410c' },
  { type: 'webhook', label: 'Webhook', category: 'Integration', color: '#1e40af' },
  { type: 'calendar', label: 'Calendar', category: 'Integration', color: '#be123c' },
  { type: 'payment', label: 'Payment', category: 'Integration', color: '#16a34a' },
  { type: 'notification', label: 'Notification', category: 'Integration', color: '#9333ea' }
];

// Componente de nó customizado com handles para conexões
const CustomNode = ({ data, selected }: any) => {
  const nodeType = nodeTypes.find(nt => nt.type === data.nodeType);
  const color = nodeType?.color || '#6b7280';
  
  return (
    <div 
      className={`px-4 py-3 rounded-lg shadow-lg border-2 bg-white min-w-[140px] cursor-move hover:shadow-xl transition-all duration-200 relative ${
        selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''
      }`}
      style={{ borderColor: color }}
    >
      <div className="text-center">
        <div 
          className="w-4 h-4 rounded-full mx-auto mb-2 border-2 border-white shadow-sm"
          style={{ backgroundColor: color }}
        />
        <div className="text-sm font-semibold text-gray-900 mb-1">{data.label}</div>
        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block">
          {data.nodeType.replace('_', ' ')}
        </div>
      </div>
      
      {/* Handle superior para conexões de entrada */}
      <div 
        className="w-3 h-3 bg-white border-2 border-gray-400 rounded-full absolute -top-1.5 left-1/2 transform -translate-x-1/2 cursor-crosshair hover:border-blue-500 hover:scale-125 transition-all duration-200 z-10"
        style={{ borderColor: color }}
        onMouseDown={(e) => {
          e.stopPropagation();
          console.log('Handle superior clicado para nó:', data.label);
        }}
      />
      
      {/* Handle inferior para conexões de saída */}
      <div 
        className="w-3 h-3 bg-white border-2 border-gray-400 rounded-full absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 cursor-crosshair hover:border-blue-500 hover:scale-125 transition-all duration-200 z-10"
        style={{ borderColor: color }}
        onMouseDown={(e) => {
          e.stopPropagation();
          console.log('Handle inferior clicado para nó:', data.label);
        }}
      />
    </div>
  );
};

const initialNodes = [
  {
    id: '1',
    type: 'custom',
    data: { label: 'Start', nodeType: 'start' },
    position: { x: 250, y: 25 },
  },
];

const initialEdges: any[] = [];

export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowDTO[]>([]);
  const [currentFlow, setCurrentFlow] = useState<FlowDTO | null>(null);
  const [showFlowEditor, setShowFlowEditor] = useState(false);
  const [showFlowForm, setShowFlowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get dynamic organization ID from context
  const { organizationId, loading: orgLoading, error: orgError } = useOrganizationContext();

  useEffect(() => {
    if (organizationId && !orgLoading) {
      loadFlows();
    }
  }, [organizationId, orgLoading]);

  const loadFlows = async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/flows/${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setFlows(data);
      } else {
        console.error('Error loading flows:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFlow = async (flow: FlowDTO) => {
    if (!organizationId) return;
    
    try {
      const url = flow.id 
        ? `http://localhost:4000/flows/${organizationId}/${flow.id}`
        : `http://localhost:4000/flows/${organizationId}`;
      
      const response = await fetch(url, {
        method: flow.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow)
      });
      
      if (response.ok) {
        await loadFlows();
        setShowFlowForm(false);
        setCurrentFlow(null);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error saving flow:', errorData);
        alert(`Error saving flow: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving flow:', error);
      alert('Error saving flow: Network error');
    }
  };

  const publishFlow = async (id: string) => {
    if (!organizationId) return;
    
    try {
      const response = await fetch(`http://localhost:4000/flows/${organizationId}/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        alert('Flow publicado com sucesso!');
        await loadFlows();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error publishing flow:', errorData);
        alert(`Erro ao publicar flow: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error publishing flow:', error);
      alert('Erro ao publicar flow');
    }
  };

  const validateFlow = async (id: string) => {
    if (!organizationId) return;
    
    try {
      const response = await fetch(`http://localhost:4000/flows/${organizationId}/${id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          alert('Validação: Sucesso');
        } else {
          const errors = result.errors?.join('\n') || 'Erro desconhecido';
          alert(`Validação: Falhou\n${errors}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error validating flow:', errorData);
        alert(`Erro ao validar flow: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error validating flow:', error);
      alert('Erro ao validar flow');
    }
  };

  const deleteFlow = async (id: string) => {
    if (!organizationId) return;
    if (!confirm('Tem certeza que deseja deletar este flow?')) return;
    
    try {
      const response = await fetch(`http://localhost:4000/flows/${organizationId}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await loadFlows();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error deleting flow:', errorData);
        alert(`Erro ao deletar flow: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting flow:', error);
      alert('Erro ao deletar flow');
    }
  };

  const openCreateForm = () => {
    if (!organizationId) return;
    
    setCurrentFlow({
      organizationId,
      name: '',
      status: 'draft',
      version: 1,
      graph: { 
        nodes: initialNodes, 
        edges: initialEdges 
      }
    });
    setShowFlowForm(true);
  };

  const openEditForm = (flow: FlowDTO) => {
    setCurrentFlow(flow);
    setShowFlowForm(true);
  };

  const openFlowEditor = (flow: FlowDTO) => {
    setCurrentFlow(flow);
    setShowFlowEditor(true);
  };

  // Show loading state while getting organization
  if (orgLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Integration Flow" />
        <div className="text-center py-8">Carregando organização...</div>
      </div>
    );
  }

  // Show error state if there's an organization error
  if (orgError || !organizationId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Integration Flow" />
        <div className="text-center py-8 text-red-600">
          Erro: {orgError || 'Organização não encontrada'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Integration Flow" 
        actions={
          <Button onClick={openCreateForm}>
            + Novo Flow
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Fluxos de Integração</CardTitle>
            <CardDescription>
              Crie e gerencie fluxos de chamadas com validação e versionamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versão</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nós</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {flows.map((flow) => (
                    <tr key={flow.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {flow.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          flow.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {flow.status === 'published' ? 'Publicado' : 'Rascunho'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        v{flow.version}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {flow.graph.nodes.length} nós
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openFlowEditor(flow)}
                          >
                            Editar
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => validateFlow(flow.id!)}
                          >
                            Validar
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => publishFlow(flow.id!)}
                            disabled={flow.status === 'published'}
                          >
                            Publicar
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteFlow(flow.id!)}
                            disabled={flow.status === 'published'}
                          >
                            Deletar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {flows.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum flow configurado. Clique em "Novo Flow" para começar.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showFlowForm && currentFlow && (
        <FlowForm 
          flow={currentFlow}
          onSave={saveFlow}
          onCancel={() => {
            setShowFlowForm(false);
            setCurrentFlow(null);
          }}
        />
      )}

      {showFlowEditor && currentFlow && (
        <FlowEditor 
          flow={currentFlow}
          onSave={saveFlow}
          onCancel={() => {
            setShowFlowEditor(false);
            setCurrentFlow(null);
          }}
        />
      )}
    </div>
  );
}

function FlowForm({ 
  flow, 
  onSave, 
  onCancel 
}: { 
  flow: FlowDTO;
  onSave: (flow: FlowDTO) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<FlowDTO>(flow);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = (field: keyof FlowDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>
            {flow.id ? 'Editar Flow' : 'Novo Flow'}
          </CardTitle>
          <CardDescription>
            Configure as informações básicas do fluxo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ex: atendimento-vendas"
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
                {flow.id ? 'Salvar' : 'Criar e Editar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function FlowEditor({ 
  flow, 
  onSave, 
  onCancel 
}: { 
  flow: FlowDTO;
  onSave: (flow: FlowDTO) => void;
  onCancel: () => void;
}) {
  const [nodes, setNodes] = useState(flow.graph.nodes || []);
  const [edges, setEdges] = useState(flow.graph.edges || []);
  const [selectedNodeType, setSelectedNodeType] = useState('');



  const onConnect = useCallback((params: any) => {
    console.log('Parâmetros de conexão recebidos:', params);
    
    // Verificar se a conexão é válida
    if (!params.source || !params.target) {
      console.error('Conexão inválida:', params);
      return;
    }
    
    const newEdge = {
      ...params,
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      label: 'Conectado'
    };
    
    setEdges((eds) => [...eds, newEdge]);
    console.log('Nova conexão criada:', newEdge);
    
    // Feedback visual
    alert(`Conexão criada: ${params.source} → ${params.target}`);
  }, []);

  const onNodesDelete = useCallback((deleted: any[]) => {
    setNodes((nds) => nds.filter((node) => !deleted.find((d) => d.id === node.id)));
    // Also remove connected edges
    setEdges((eds) => eds.filter((edge) => 
      !deleted.find((d) => d.id === edge.source || d.id === edge.target)
    ));
  }, []);

  const addNode = (nodeType: string) => {
    const nodeTypeInfo = nodeTypes.find(nt => nt.type === nodeType);
    const newNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      data: { 
        label: nodeTypeInfo?.label || nodeType,
        nodeType
      },
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
    };
    setNodes((nds) => [...nds, newNode]);
    console.log(`Added node: ${nodeType} at position ${newNode.position.x}, ${newNode.position.y}`);
  };

  const saveFlow = () => {
    const updatedFlow = {
      ...flow,
      graph: {
        nodes: nodes,
        edges: edges
      }
    };
    onSave(updatedFlow);
  };

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Flow Editor: {flow.name}</h2>
            <p className="text-sm text-gray-500">Arraste nós da barra lateral para criar seu fluxo</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              {nodes.length} nós • {edges.length} conexões
              {edges.length > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  ✓ Fluxo conectado ({edges.length} conexões)
                </span>
              )}
              {nodes.length > 0 && edges.length === 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  ⚠️ Nós adicionados, mas sem conexões
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (confirm('Limpar todo o canvas?')) {
                    setNodes([]);
                    setEdges([]);
                  }
                }}
                disabled={nodes.length === 0}
              >
                Limpar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (nodes.length >= 2) {
                    const newEdge = {
                      id: `test_edge_${Date.now()}`,
                      source: nodes[0].id,
                      target: nodes[1].id,
                      type: 'smoothstep',
                      animated: true,
                      style: { stroke: '#10b981', strokeWidth: 3 },
                      label: 'Teste'
                    };
                    setEdges((eds) => [...eds, newEdge]);
                    alert('Conexão de teste criada!');
                  } else {
                    alert('Adicione pelo menos 2 nós primeiro!');
                  }
                }}
                disabled={nodes.length < 2}
              >
                Testar Conexão
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button variant="default" onClick={saveFlow}>
                Salvar Flow
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Sidebar com nós */}
          <div className="w-64 bg-gray-50 border-r flex flex-col">
            <div className="p-4 border-b bg-white flex-shrink-0">
              <h3 className="font-semibold text-gray-900">Nós Disponíveis</h3>
              <p className="text-sm text-gray-500 mt-1">Clique para adicionar ao fluxo</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {Object.entries(
                nodeTypes.reduce((acc, node) => {
                  if (!acc[node.category]) acc[node.category] = [];
                  acc[node.category].push(node);
                  return acc;
                }, {} as Record<string, typeof nodeTypes>)
              ).map(([category, categoryNodes]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 py-1">{category}</h4>
                  <div className="space-y-2">
                    {categoryNodes.map((nodeType) => (
                      <button
                        key={nodeType.type}
                        onClick={() => addNode(nodeType.type)}
                        className="w-full text-left p-3 text-sm rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: nodeType.color }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 group-hover:text-gray-700">
                              {nodeType.label}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {nodeType.type.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas do ReactFlow */}
          <div className="flex-1 relative">
            {nodes.length === 0 ? (
              <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Comece a criar seu fluxo</h3>
                  <p className="text-gray-500 mb-4">Clique nos nós da barra lateral para adicionar ao canvas</p>
                  <div className="text-sm text-gray-400 mb-4">
                    💡 Dica: Comece com um nó "Start" e conecte com outros nós
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>• <strong>Adicionar nó:</strong> Clique nos botões da barra lateral</div>
                    <div>• <strong>Mover nó:</strong> Arraste o nó no canvas</div>
                    <div>• <strong>Conectar nós:</strong> Use o botão "Testar Conexão" ou arraste entre nós</div>
                    <div>• <strong>Deletar nó:</strong> Selecione e pressione Delete</div>
                    <div>• <strong>Zoom:</strong> Use scroll do mouse ou controles</div>
                    <div className="mt-2 text-blue-600 font-medium">
                      💡 Dica: Adicione 2 nós e clique em "Testar Conexão" para ver as conexões funcionando!
                    </div>
                  </div>
                </div>
              </div>
            ) : (
                             <ReactFlow
                 nodes={nodes}
                 edges={edges}
                 onConnect={onConnect}
                 onNodesDelete={onNodesDelete}
                 nodeTypes={{ custom: CustomNode }}
                 onNodesChange={(changes) => {
                   // Basic node change handling
                   changes.forEach((change) => {
                     if (change.type === 'position' && change.position) {
                       setNodes((nds) => 
                         nds.map((node) => 
                           node.id === change.id 
                             ? { ...node, position: change.position! }
                             : node
                         )
                       );
                     }
                   });
                 }}
                 onConnectStart={(event, { nodeId, handleType }) => {
                   console.log('Iniciando conexão de:', nodeId, handleType);
                 }}
                 onConnectEnd={(event) => {
                   console.log('Conexão finalizada');
                 }}
                 fitView
                 minZoom={0.1}
                 maxZoom={2}
                 defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                 deleteKeyCode="Delete"
                 multiSelectionKeyCode="Shift"
                 snapToGrid={true}
                 snapGrid={[15, 15]}
                 connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
               >
                <Controls />
                <Background />
                <MiniMap 
                  nodeColor={(node) => {
                    const nodeType = nodeTypes.find(nt => nt.type === node.data.nodeType);
                    return nodeType?.color || '#6b7280';
                  }}
                  nodeStrokeWidth={3}
                  zoomable
                  pannable
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  className="border border-gray-200 rounded-lg shadow-sm"
                />
              </ReactFlow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

