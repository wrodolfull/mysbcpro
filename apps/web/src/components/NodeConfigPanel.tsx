'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { useOrganizationContext } from '../contexts/OrganizationContext';

interface NodeConfigPanelProps {
  node: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (node: Node) => void;
  nodeTypes: any[];
}

export default function NodeConfigPanel({ 
  node, 
  onUpdateNode, 
  onDeleteNode, 
  onDuplicateNode,
  nodeTypes 
}: NodeConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'xml' | 'preview'>('config');
  const [xmlPreview, setXmlPreview] = useState<string>('');
  const [inbounds, setInbounds] = useState<any[]>([]);
  const [loadingInbounds, setLoadingInbounds] = useState(false);

  const { organizationId } = useOrganizationContext();
  const nodeType = node ? nodeTypes.find(nt => nt.type === node.data.nodeType) : null;

  useEffect(() => {
    if (node && nodeType) {
      generateXMLPreview();
    }
  }, [node, nodeType]);

  // Load inbounds when organization changes or when we have a start node
  useEffect(() => {
    if (organizationId && node?.data.nodeType === 'start') {
      loadInbounds();
    }
  }, [organizationId, node?.data.nodeType]);

  const loadInbounds = async () => {
    if (!organizationId) return;
    
    try {
      setLoadingInbounds(true);
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
      setLoadingInbounds(false);
    }
  };

  const generateXMLPreview = () => {
    if (!node || !nodeType) return;

    let xml = '';
    
    switch (nodeType.type) {
      case 'start':
        xml = `<!-- Start -->\n<action application="set" data="organizationID=${node.data.organizationID || '${organizationID}'}"/>`;
        break;
        
      case 'answer':
        if (node.data.enabled !== false) {
          xml = `<action application="answer"/>`;
        }
        break;
        
      case 'set_defaults':
        xml = `<action application="set" data="organizationID=${node.data.organizationID || '${organizationID}'}"/>\n`;
        xml += `<action application="set" data="AUDIO_BASE=/usr/local/freeswitch/recordings/\${organizationID}"/>`;
        
        if (node.data.extraVars && Array.isArray(node.data.extraVars)) {
          node.data.extraVars.forEach((extraVar: string) => {
            if (extraVar.includes('=')) {
              xml += `\n<action application="set" data="${extraVar}"/>`;
            }
          });
        }
        break;
        
              case 'play_audio':
          xml = `<action application="playback" data="\${AUDIO_BASE}/${node.data.file || 'prompt.wav'}"/>`;
          break;
        
      case 'collect_digits':
        const min = node.data.min || 1;
        const max = node.data.max || 11;
        const tries = node.data.tries || 3;
        const timeout = node.data.timeoutMs || 7000;
        const terminator = node.data.terminator || '#';
        const prompt = node.data.prompt || 'prompt.wav';
        const invalidPrompt = node.data.invalidPrompt || 'invalid.wav';
        const varName = node.data.varName || 'INPUT';
        
        xml = `<action application="play_and_get_digits" data="${min} ${max} ${tries} ${timeout} ${terminator} \${AUDIO_BASE}/${prompt} \${AUDIO_BASE}/${invalidPrompt} ${varName}"/>`;
        break;
        
      case 'sanitize_digits':
        const sourceVar = node.data.sourceVar || 'INPUT';
        const targetVar = node.data.targetVar || 'CLEAN_INPUT';
        xml = `<action application="regex" data="\${${sourceVar}} (\\\\D) &quot;&quot; ${targetVar}"/>`;
        break;
        
      case 'validate_with_script':
        const language = node.data.language || 'lua';
        const script = node.data.script || 'validate.lua';
        const args = node.data.args || '${INPUT}';
        
        if (language === 'python') {
          xml = `<action application="pyrun" data="/usr/local/freeswitch/scripts/${script} ${args}"/>`;
        } else {
          xml = `<action application="lua" data="${script} ${args}"/>`;
        }
        break;
        
      case 'feedback_while_validating':
        xml = `<action application="playback" data="\${AUDIO_BASE}/${node.data.file || 'validating.wav'}"/>`;
        break;
        
      case 'branch_by_status':
        const statusVar = node.data.statusVar || 'sf_status';
        xml = `<condition field="${statusVar}" expression="^OK$">\n`;
        xml += `  <!-- OK path -->\n`;
        xml += `</condition>\n`;
        xml += `<condition field="${statusVar}" expression="^NOT_FOUND$">\n`;
        xml += `  <!-- NOT_FOUND path -->\n`;
        xml += `</condition>\n`;
        xml += `<condition field="${statusVar}" expression="^ERROR$">\n`;
        xml += `  <!-- ERROR path -->\n`;
        xml += `</condition>`;
        break;
        
      case 'route_result':
        const routeVar = node.data.routeVar || 'sf_route';
        xml = `<condition field="${routeVar}" expression="^callcenter:(.+)$">\n`;
        xml += `  <action application="callcenter" data="$1"/>\n`;
        xml += `</condition>\n`;
        xml += `<condition field="${routeVar}" expression="^transfer:(.+)$">\n`;
        xml += `  <action application="transfer" data="$1"/>\n`;
        xml += `</condition>\n`;
        xml += `<condition field="${routeVar}" expression="^bridge:(.+)$">\n`;
        xml += `  <action application="bridge" data="$1"/>\n`;
        xml += `</condition>`;
        break;
        
      case 'offer_fallback':
        const notFoundFile = node.data.notFoundFile || 'not_found.wav';
        const optionPromptFile = node.data.optionPromptFile || 'option_prompt.wav';
        const fallbackQueue = node.data.fallbackQueue || 'queue_padrao@default';
        
        xml = `<action application="playback" data="\${AUDIO_BASE}/${notFoundFile}"/>\n`;
        xml += `<action application="play_and_get_digits" data="1 1 1 5000 # \${AUDIO_BASE}/${optionPromptFile} \${AUDIO_BASE}/entrada_invalida.wav OP"/>\n`;
        xml += `<condition field="\${OP}" expression="^9$">\n`;
        xml += `  <action application="callcenter" data="${fallbackQueue}"/>\n`;
        xml += `</condition>\n`;
        xml += `<action application="hangup" data="NORMAL_CLEARING"/>`;
        break;
        
      case 'transfer':
        xml = `<action application="transfer" data="${node.data.destination || '3000 XML default'}"/>`;
        break;
        
      case 'bridge':
        xml = `<action application="bridge" data="${node.data.destination || 'sofia/gateway/GW1/5511999999999'}"/>`;
        break;
        
      case 'callcenter':
        xml = `<action application="callcenter" data="${node.data.queue || 'queue_vips@default'}"/>`;
        break;
        
      case 'hangup':
        xml = `<action application="hangup" data="${node.data.cause || 'NORMAL_CLEARING'}"/>`;
        break;
        
      default:
        xml = `<!-- Nó não configurado -->`;
    }
    
    setXmlPreview(xml);
  };

  const handleConfigChange = (key: string, value: any) => {
    if (!node) return;
    
    const updatedData = { ...node.data, [key]: value };
    onUpdateNode(node.id, updatedData);
  };

  const renderConfigField = (prop: any) => {
    const value = node?.data[prop.name];
    
    switch (prop.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={prop.name}
              checked={value === true}
              onChange={(e) => handleConfigChange(prop.name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={prop.name} className="text-sm font-medium text-gray-700">
              {prop.label}
            </label>
          </div>
        );
        
      case 'select':
        return (
          <div>
            <label htmlFor={prop.name} className="block text-sm font-medium text-gray-700 mb-1">
              {prop.label}
            </label>
            <select
              id={prop.name}
              value={value || ''}
              onChange={(e) => handleConfigChange(prop.name, e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {prop.options?.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );

      case 'inbound_select':
        return (
          <div>
            <label htmlFor={prop.name} className="block text-sm font-medium text-gray-700 mb-1">
              {prop.label} {prop.required && <span className="text-red-500">*</span>}
            </label>
            <select
              id={prop.name}
              value={value || ''}
              onChange={(e) => handleConfigChange(prop.name, e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={loadingInbounds}
            >
              <option value="">
                {loadingInbounds ? 'Carregando...' : 'Selecione um Inbound Connector'}
              </option>
              {inbounds.map((inbound) => (
                <option key={inbound.id} value={inbound.id}>
                  {inbound.name} ({inbound.didOrUri})
                </option>
              ))}
            </select>
            {inbounds.length === 0 && !loadingInbounds && (
              <p className="text-xs text-gray-500 mt-1">
                Nenhum Inbound Connector disponível. Crie um primeiro na página /inbounds.
              </p>
            )}
          </div>
        );
        
      case 'number':
        return (
          <div>
            <label htmlFor={prop.name} className="block text-sm font-medium text-gray-700 mb-1">
              {prop.label}
            </label>
            <input
              type="number"
              id={prop.name}
              value={value || ''}
              onChange={(e) => handleConfigChange(prop.name, Number(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        );
        
      case 'array':
        return (
          <div>
            <label htmlFor={prop.name} className="block text-sm font-medium text-gray-700 mb-1">
              {prop.label}
            </label>
            <input
              type="text"
              id={prop.name}
              value={value || ''}
              onChange={(e) => handleConfigChange(prop.name, e.target.value)}
              placeholder="key1=value1,key2=value2"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: chave=valor separados por vírgula
            </p>
          </div>
        );
        
      default:
        return (
          <div>
            <label htmlFor={prop.name} className="block text-sm font-medium text-gray-700 mb-1">
              {prop.label}
            </label>
            <input
              type="text"
              id={prop.name}
              value={value || ''}
              onChange={(e) => handleConfigChange(prop.name, e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        );
    }
  };

  if (!node || !nodeType) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <div className="text-center text-gray-500">
          <p>Selecione um nó para configurar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{node.data.label}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => onDuplicateNode(node)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Duplicar nó"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => onDeleteNode(node.id)}
              className="p-1 text-red-400 hover:text-red-600"
              title="Deletar nó"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">{nodeType.description}</p>
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {nodeType.category}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configuração
          </button>
          <button
            onClick={() => setActiveTab('xml')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'xml'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            XML
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pré-visualização
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'config' && (
          <div className="space-y-4">
            {nodeType.configProps?.map((prop: any) => (
              <div key={prop.name} className="space-y-2">
                {renderConfigField(prop)}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'xml' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">XML do FreeSWITCH</h4>
              <pre className="bg-gray-50 p-3 rounded-md text-xs text-gray-800 overflow-x-auto">
                {xmlPreview}
              </pre>
            </div>
            <div className="text-xs text-gray-500">
              <p>Este XML será incluído no contexto do FreeSWITCH quando o flow for deployado.</p>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Pré-visualização em Tempo Real</h4>
              <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-800 overflow-x-auto">
                <div className="font-mono">
                  {xmlPreview.split('\n').map((line, index) => (
                    <div key={index} className="whitespace-pre">{line}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              <p>Visualização em tempo real do XML que será gerado para este nó.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
