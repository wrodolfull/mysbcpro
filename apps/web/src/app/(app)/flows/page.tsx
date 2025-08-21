'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOrganizationContext } from '../../../contexts/OrganizationContext';
import ReactFlow, { 
  Controls, 
  Background, 
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import NodeConfigPanel from '../../../components/NodeConfigPanel';
import FlowXMLPreview from '../../../components/FlowXMLPreview';
import { NodeType, Flow } from '../../../types/flow';
import { Node, Edge } from 'reactflow';

// Função para gerar XML do FreeSwitch com a nova estrutura
const generateFreeSwitchXML = (flow: any, nodes: Node[], edges: Edge[], nodeTypes: any[]) => {
  const flowName = flow.name.toLowerCase().replace(/\s+/g, '_');
  
  let xml = `<context name="default">\n`;
  xml += `  <extension name="${flowName}-flow">\n`;
  xml += `    <condition field="destination_number" expression="^7000$">\n\n`;
  
  // Processar nós em ordem
  const sortedNodes = sortNodesByPosition(nodes);
  
  sortedNodes.forEach((node, index) => {
    const nodeData = node.data;
    const nodeType = nodeTypes.find(nt => nt.type === nodeData.nodeType || nt.label === nodeData.label);
    
    if (nodeType) {
      xml += `      <!-- ${nodeData.label} -->\n`;
      
      switch (nodeType.type) {
        case 'start':
          xml += `      <!-- Start -->\n`;
          xml += `      <action application="set" data="organizationID=${flow.organizationId || '${organizationID}'}"/>\n`;
          break;
          
        case 'answer':
          if (nodeData.enabled !== false) {
            xml += `      <action application="answer"/>\n`;
          }
          break;
          
        case 'set_defaults':
          xml += `      <action application="set" data="organizationID=${flow.organizationId || '${organizationID}'}"/>\n`;
          xml += `      <action application="set" data="AUDIO_BASE=/usr/local/freeswitch/recordings/\${organizationID}"/>\n`;
          
          // Variáveis extras
          if (nodeData.extraVars && Array.isArray(nodeData.extraVars)) {
            nodeData.extraVars.forEach((extraVar: string) => {
              if (extraVar.includes('=')) {
                xml += `      <action application="set" data="${extraVar}"/>\n`;
              }
            });
          }
          break;
          
        case 'play_audio':
          xml += `      <action application="playback" data="\${AUDIO_BASE}/${nodeData.file || 'prompt.wav'}"/>\n`;
          break;
          
        case 'collect_digits':
          const min = nodeData.min || 1;
          const max = nodeData.max || 11;
          const tries = nodeData.tries || 3;
          const timeout = nodeData.timeoutMs || 7000;
          const terminator = nodeData.terminator || '#';
          const prompt = nodeData.prompt || 'prompt.wav';
          const invalidPrompt = nodeData.invalidPrompt || 'invalid.wav';
          const varName = nodeData.varName || 'INPUT';
          
          xml += `      <action application="play_and_get_digits" data="${min} ${max} ${tries} ${timeout} ${terminator} \${AUDIO_BASE}/${prompt} \${AUDIO_BASE}/${invalidPrompt} ${varName}"/>\n`;
          break;
          
        case 'sanitize_digits':
          const sourceVar = nodeData.sourceVar || 'INPUT';
          const targetVar = nodeData.targetVar || 'CLEAN_INPUT';
          xml += `      <action application="regex" data="\${${sourceVar}} (\\\\D) &quot;&quot; ${targetVar}"/>\n`;
          break;
          
        case 'validate_with_script':
          const language = nodeData.language || 'lua';
          const script = nodeData.script || 'validate.lua';
          const args = nodeData.args || '${INPUT}';
          
          if (language === 'python') {
            xml += `      <action application="pyrun" data="/usr/local/freeswitch/scripts/${script} ${args}"/>\n`;
          } else {
            xml += `      <action application="lua" data="${script} ${args}"/>\n`;
          }
          break;
          
        case 'feedback_while_validating':
          xml += `      <action application="playback" data="\${AUDIO_BASE}/${nodeData.file || 'validating.wav'}"/>\n`;
          break;
          
        case 'branch_by_status':
          const statusVar = nodeData.statusVar || 'sf_status';
          xml += `      <condition field="${statusVar}" expression="^OK$">\n`;
          xml += `        <!-- OK path - será conectado por edges -->\n`;
          xml += `      </condition>\n`;
          xml += `      <condition field="${statusVar}" expression="^NOT_FOUND$">\n`;
          xml += `        <!-- NOT_FOUND path - será conectado por edges -->\n`;
          xml += `      </condition>\n`;
          xml += `      <condition field="${statusVar}" expression="^ERROR$">\n`;
          xml += `        <!-- ERROR path - será conectado por edges -->\n`;
          xml += `      </condition>\n`;
          break;
          
        case 'route_result':
          const routeVar = nodeData.routeVar || 'sf_route';
          xml += `      <condition field="${routeVar}" expression="^callcenter:(.+)$">\n`;
          xml += `        <action application="callcenter" data="$1"/>\n`;
          xml += `      </condition>\n`;
          xml += `      <condition field="${routeVar}" expression="^transfer:(.+)$">\n`;
          xml += `        <action application="transfer" data="$1"/>\n`;
          xml += `      </condition>\n`;
          xml += `      <condition field="${routeVar}" expression="^bridge:(.+)$">\n`;
          xml += `        <action application="bridge" data="$1"/>\n`;
          xml += `      </condition>\n`;
          break;
          
        case 'offer_fallback':
          const notFoundFile = nodeData.notFoundFile || 'not_found.wav';
          const optionPromptFile = nodeData.optionPromptFile || 'option_prompt.wav';
          const fallbackQueue = nodeData.fallbackQueue || 'queue_padrao@default';
          
          xml += `      <action application="playback" data="\${AUDIO_BASE}/${notFoundFile}"/>\n`;
          xml += `      <action application="play_and_get_digits" data="1 1 1 5000 # \${AUDIO_BASE}/${optionPromptFile} \${AUDIO_BASE}/entrada_invalida.wav OP"/>\n`;
          xml += `      <condition field="\${OP}" expression="^9$">\n`;
          xml += `        <action application="callcenter" data="${fallbackQueue}"/>\n`;
          xml += `      </condition>\n`;
          xml += `      <action application="hangup" data="NORMAL_CLEARING"/>\n`;
          break;
          
        case 'transfer':
          xml += `      <action application="transfer" data="${nodeData.destination || '3000 XML default'}"/>\n`;
          break;
          
        case 'bridge':
          xml += `      <action application="bridge" data="${nodeData.destination || 'sofia/gateway/GW1/5511999999999'}"/>\n`;
          break;
          
        case 'callcenter':
          xml += `      <action application="callcenter" data="${nodeData.queue || 'queue_vips@default'}"/>\n`;
          break;
          
        case 'hangup':
          xml += `      <action application="hangup" data="${nodeData.cause || 'NORMAL_CLEARING'}"/>\n`;
          break;
      }
      
      xml += `\n`;
    }
  });
  
  xml += `    </condition>\n`;
  xml += `  </extension>\n`;
  xml += `</context>`;
  
  return xml;
};

// Função para ordenar nós por posição (top-left para bottom-right)
const sortNodesByPosition = (nodes: Node[]) => {
  return [...nodes].sort((a, b) => {
    // O nó start deve sempre ser o primeiro
    if (a.data.nodeType === 'start') return -1;
    if (b.data.nodeType === 'start') return 1;
    
    // Para outros nós, ordenar por posição
    if (Math.abs(a.position.y - b.position.y) < 50) {
      // Se estão na mesma linha, ordena por X
      return a.position.x - b.position.x;
    }
    // Senão, ordena por Y
    return a.position.y - b.position.y;
  });
};

// Função para salvar XML diretamente no FreeSwitch
const saveToFreeSwitch = async (flow: any, xml: string) => {
  try {
    // Salvar XML no FreeSwitch via backend
    const response = await fetch('http://localhost:4000/freeswitch/save-ivr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flowName: flow.name.toLowerCase().replace(/\s+/g, '_'),
        xml: xml,
        organizationId: flow.organizationId,
        targetPath: '/usr/local/freeswitch/conf/ivr_menus/'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('XML salvo no FreeSwitch:', result);
      return { success: true, data: result };
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Erro ao salvar no FreeSwitch:', errorData);
      return { success: false, error: errorData.message };
    }
  } catch (error) {
    console.error('Erro ao salvar no FreeSwitch:', error);
    return { success: false, error: 'Network error' };
  }
};

// Função para salvar no Supabase

export default function FlowsPage() {
  // Tipos de nós FreeSwitch - Estrutura completa para IVR funcional
  const nodeTypes = useMemo(() => [
    // Nó inicial - Inbound Connector
    { 
      type: 'start', 
      label: 'Start', 
      category: 'Inbound Connector', 
      color: '#16a34a',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      description: 'Ponto de entrada da chamada - Associe um Inbound Connector para que as chamadas sejam roteadas para este flow - OBRIGATÓRIO e deve ser o primeiro nó',
      freeswitchAction: 'set',
      defaultDigits: '7000',
      hasConfig: true,
      configProps: [
        { name: 'selectedInboundId', type: 'inbound_select', label: 'Inbound Connector', required: true }
      ],
      isRequired: true,
      mustBeFirst: true
    },
    
    // Nós de configuração inicial
    { 
      type: 'answer', 
      label: 'Answer', 
      category: 'Call Control', 
      color: '#059669',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      description: 'Atende a chamada',
      freeswitchAction: 'answer',
      hasConfig: true,
      configProps: [
        { name: 'enabled', type: 'boolean', default: true, label: 'Atender chamada' }
      ]
    },
    
    { 
      type: 'set_defaults', 
      label: 'Set Defaults', 
      category: 'Call Control', 
      color: '#0d9488',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'Define variáveis padrão do canal',
      freeswitchAction: 'set',
      hasConfig: true,
      configProps: [
        { name: 'organizationID', type: 'string', default: '', label: 'Organization ID' },
        { name: 'extraVars', type: 'array', default: [], label: 'Variáveis extras (key=value)' }
      ]
    },
    
    // Nós de áudio
    { 
      type: 'play_audio', 
      label: 'Play Audio', 
      category: 'Audio', 
      color: '#7c3aed',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      ),
      description: 'Toca arquivo de áudio',
      freeswitchAction: 'playback',
      hasConfig: true,
      configProps: [
        { name: 'file', type: 'string', default: 'prompt.wav', label: 'Arquivo de áudio' }
      ]
    },
    
    { 
      type: 'collect_digits', 
      label: 'Collect Digits',
      category: 'Audio', 
      color: '#9333ea',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      description: 'Coleta dígitos do usuário',
      freeswitchAction: 'play_and_get_digits',
      hasConfig: true,
      configProps: [
        { name: 'varName', type: 'string', default: 'INPUT', label: 'Nome da variável' },
        { name: 'min', type: 'number', default: 1, label: 'Mínimo de dígitos' },
        { name: 'max', type: 'number', default: 11, label: 'Máximo de dígitos' },
        { name: 'tries', type: 'number', default: 3, label: 'Tentativas' },
        { name: 'timeoutMs', type: 'number', default: 7000, label: 'Timeout (ms)' },
        { name: 'terminator', type: 'string', default: '#', label: 'Terminador' },
        { name: 'prompt', type: 'string', default: 'prompt.wav', label: 'Prompt de áudio' },
        { name: 'invalidPrompt', type: 'string', default: 'invalid.wav', label: 'Áudio de erro' }
      ]
    },
    
    // Nós de processamento
    { 
      type: 'sanitize_digits', 
      label: 'Sanitize Digits', 
      category: 'Data Processing', 
      color: '#dc2626',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      description: 'Remove caracteres não numéricos',
      freeswitchAction: 'regex',
      hasConfig: true,
      configProps: [
        { name: 'sourceVar', type: 'string', default: 'INPUT', label: 'Variável fonte' },
        { name: 'targetVar', type: 'string', default: 'CLEAN_INPUT', label: 'Variável destino' }
      ]
    },
    
    { 
      type: 'validate_with_script', 
      label: 'Validate With Script', 
      category: 'Data Processing', 
      color: '#ea580c',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      description: 'Valida dados com script Lua/Python',
      freeswitchAction: 'lua',
      hasConfig: true,
      configProps: [
        { name: 'language', type: 'select', default: 'lua', options: ['lua', 'python'], label: 'Linguagem' },
        { name: 'script', type: 'string', default: 'validate.lua', label: 'Nome do script' },
        { name: 'args', type: 'string', default: '${INPUT}', label: 'Argumentos' }
      ]
    },
    
    { 
      type: 'feedback_while_validating', 
      label: 'Feedback While Validating', 
      category: 'Audio', 
      color: '#ca8a04',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: 'Toca áudio durante validação',
      freeswitchAction: 'playback',
      hasConfig: true,
      configProps: [
        { name: 'file', type: 'string', default: 'validating.wav', label: 'Arquivo de áudio' }
      ]
    },
    
    // Nós de decisão
    { 
      type: 'branch_by_status', 
      label: 'Branch By Status', 
      category: 'Flow Control', 
      color: '#0891b2',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: 'Ramifica baseado no status',
      freeswitchAction: 'condition',
      hasConfig: true,
      configProps: [
        { name: 'statusVar', type: 'string', default: 'sf_status', label: 'Variável de status' },
        { name: 'okPath', type: 'string', default: 'OK', label: 'Caminho para OK' },
        { name: 'notFoundPath', type: 'string', default: 'NOT_FOUND', label: 'Caminho para NOT_FOUND' },
        { name: 'errorPath', type: 'string', default: 'ERROR', label: 'Caminho para ERROR' }
      ]
    },
    
    // Nós de roteamento
    { 
      type: 'route_result', 
      label: 'Route Result', 
      category: 'Routing', 
      color: '#be185d',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      description: 'Roteia baseado no resultado',
      freeswitchAction: 'condition',
      hasConfig: true,
      configProps: [
        { name: 'routeVar', type: 'string', default: 'sf_route', label: 'Variável de rota' },
        { name: 'defaultRoute', type: 'string', default: 'transfer:3000 XML default', label: 'Rota padrão' }
      ]
    },
    
    { 
      type: 'offer_fallback', 
      label: 'Offer Fallback', 
      category: 'Routing', 
      color: '#a16207',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      description: 'Oferece opção de fallback',
      freeswitchAction: 'playand_get_digits',
      hasConfig: true,
      configProps: [
        { name: 'notFoundFile', type: 'string', default: 'not_found.wav', label: 'Áudio de não encontrado' },
        { name: 'optionPromptFile', type: 'string', default: 'option_prompt.wav', label: 'Prompt de opção' },
        { name: 'fallbackQueue', type: 'string', default: 'queue_padrao@default', label: 'Fila de fallback' },
        { name: 'fallbackGateway', type: 'string', default: '', label: 'Gateway de fallback' }
      ]
    },
    
    // Nós de ação final
    { 
      type: 'transfer', 
      label: 'Transfer', 
      category: 'Actions', 
      color: '#1d4ed8',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      description: 'Transfere a chamada',
      freeswitchAction: 'transfer',
      hasConfig: true,
      configProps: [
        { name: 'destination', type: 'string', default: '3000 XML default', label: 'Destino' }
      ]
    },
    
    { 
      type: 'bridge', 
      label: 'Bridge', 
      category: 'Actions', 
      color: '#1e40af',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      description: 'Conecta a chamada',
      freeswitchAction: 'bridge',
      hasConfig: true,
      configProps: [
        { name: 'destination', type: 'string', default: 'sofia/gateway/GW1/5511999999999', label: 'Destino' }
      ]
    },
    
    { 
      type: 'callcenter', 
      label: 'Call Center',
      category: 'Actions', 
      color: '#1e3a8a',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: 'Envia para fila de atendimento',
      freeswitchAction: 'callcenter',
      hasConfig: true,
      configProps: [
        { name: 'queue', type: 'string', default: 'queue_vips@default', label: 'Fila' }
      ]
    },
    
    { 
      type: 'hangup', 
      label: 'Hangup', 
      category: 'Actions', 
      color: '#991b1b',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      description: 'Encerra a chamada',
      freeswitchAction: 'hangup',
      hasConfig: true,
      configProps: [
        { name: 'cause', type: 'string', default: 'NORMAL_CLEARING', label: 'Causa do encerramento' }
      ]
    },
    
    { 
      type: 'end', 
      label: 'End', 
      category: 'Flow Control', 
      color: '#dc2626',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      description: 'Finaliza o flow com sucesso',
      freeswitchAction: 'hangup',
      hasConfig: true,
      configProps: [
        { name: 'cause', type: 'string', default: 'NORMAL_CLEARING', label: 'Causa do encerramento' }
      ]
    }
  ], []);

  // Categorias únicas
  const categories = useMemo(() => Array.from(new Set(nodeTypes.map(nt => nt.category))), [nodeTypes]);

  const initialNodes: Node[] = [
    {
      id: 'start-1',
      type: 'default',
      position: { x: 100, y: 100 },
      data: {
        label: 'Start',
        nodeType: 'start',
        type: 'start'
      }
    }
  ];
  const initialEdges: Edge[] = [];

  // Função para salvar no Supabase
  const saveToSupabase = async (flow: any, nodes: Node[], edges: Edge[]) => {
    try {
      // Aqui você integraria com o Supabase
      const flowData = {
        id: flow.id,
        name: flow.name,
        organizationId: flow.organizationId,
        status: flow.status,
        version: flow.version,
        graph: { nodes, edges },
        freeswitch_xml: generateFreeSwitchXML(flow, nodes, edges, nodeTypes),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Salvando no Supabase:', flowData);
      
      // Simular salvamento no Supabase
      // const { data, error } = await supabase
      //   .from('flows')
      //   .upsert(flowData);
      
      return { success: true, data: flowData };
    } catch (error) {
      console.error('Erro ao salvar no Supabase:', error);
      return { success: false, error };
    }
  };

  const [flows, setFlows] = useState<any[]>([]);
  const [currentFlow, setCurrentFlow] = useState<any>(null);
  const [showFlowEditor, setShowFlowEditor] = useState(false);
  const [showFlowForm, setShowFlowForm] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const saveFlow = async (flow: any) => {
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
        // Não limpar currentFlow se estiver no editor
        if (!showFlowEditor) {
          setCurrentFlow(null);
        }
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

  const validateFlowStructure = (flow: any) => {
    if (!flow.graph?.nodes || flow.graph.nodes.length === 0) {
      return { valid: false, error: 'Flow deve ter pelo menos um nó' };
    }
    
    // Verificar se tem nó start
    const startNode = flow.graph.nodes.find((node: any) => 
      node.type === 'start' || node.data?.nodeType === 'start'
    );
    if (!startNode) {
      return { valid: false, error: 'Flow deve ter um nó Start' };
    }
    
    // Verificar se tem pelo menos um nó de fim (end, hangup, transfer, bridge, callcenter)
    const endNodes = flow.graph.nodes.filter((node: any) => {
      const nodeType = node.type !== 'default' ? node.type : node.data?.nodeType;
      return ['end', 'hangup', 'transfer', 'bridge', 'callcenter'].includes(nodeType);
    });
    
    if (endNodes.length === 0) {
      return { valid: false, error: 'Flow deve ter pelo menos um nó de fim (End, Hangup, Transfer, Bridge ou Call Center)' };
    }
    
    // Verificar se todos os nós têm tipos válidos
    const validNodeTypes = nodeTypes.map(nt => nt.type);
    for (const node of flow.graph.nodes) {
      const nodeType = node.type !== 'default' ? node.type : node.data?.nodeType;
      if (!nodeType || !validNodeTypes.includes(nodeType)) {
        return { valid: false, error: `Nó "${node.data?.label || node.id}" tem tipo inválido: ${nodeType}` };
      }
    }
    
    // Verificar conectividade básica
    if (flow.graph.edges && flow.graph.edges.length > 0) {
      const nodeIds = flow.graph.nodes.map((n: any) => n.id);
      for (const edge of flow.graph.edges) {
        if (!nodeIds.includes(edge.source) || !nodeIds.includes(edge.target)) {
          return { valid: false, error: 'Flow tem conexões inválidas entre nós' };
        }
      }
    }
    
    return { valid: true };
  };

  const publishFlow = async (id: string) => {
    if (!organizationId) return;
    
    // Encontrar o flow atual
    const currentFlow = flows.find(f => f.id === id);
    if (!currentFlow) {
      alert('Flow não encontrado');
      return;
    }
    
    // Mapear nós para validação (mesmo formato que será enviado)
    const mappedNodes = currentFlow.graph?.nodes?.map((node: any) => {
      // Determinar o tipo correto do nó
      let correctType = node.data?.nodeType;
      
      // Se não tem nodeType, tentar usar o type
      if (!correctType && node.type && node.type !== 'default') {
        correctType = node.type;
      }
      
      // Se ainda não tem tipo válido, usar 'default' como fallback
      if (!correctType) {
        correctType = 'default';
      }
      
      console.log(`🔍 Mapeando nó ${node.id}:`, {
        originalType: node.type,
        nodeType: node.data?.nodeType,
        correctType: correctType
      });
      
      return {
        ...node,
        type: correctType, // Usar o tipo correto
        data: {
          ...node.data,
          type: correctType // Garantir que o tipo está na data também
        }
      };
    }) || [];

    const flowForValidation = {
      ...currentFlow,
      graph: {
        ...currentFlow.graph,
        nodes: mappedNodes
      }
    };
    
    // Validar estrutura do flow antes de publicar
    const validation = validateFlowStructure(flowForValidation);
    if (!validation.valid) {
      alert(`Erro de validação: ${validation.error}`);
      return;
    }
    
    // Criar flow com nós mapeados para enviar ao backend
    const flowToPublish = {
      ...currentFlow,
      graph: {
        nodes: mappedNodes,
        edges: currentFlow.graph?.edges || []
      }
    };
    
    // Debug: verificar o que está sendo enviado
    console.log('🔍 Flow para publicação:', flowToPublish);
    console.log('🔍 Nós mapeados:', mappedNodes);
    
    try {
      const response = await fetch(`http://localhost:4000/flows/${organizationId}/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowToPublish) // Enviar o flow com nós mapeados
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

  const unpublishFlow = async (id: string) => {
    if (!organizationId) return;
    
    try {
      const response = await fetch(`http://localhost:4000/flows/${organizationId}/${id}/unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        alert('Flow despublicado com sucesso! Status alterado para rascunho.');
        await loadFlows();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error unpublishing flow:', errorData);
        alert(`Erro ao despublicar flow: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error unpublishing flow:', error);
      alert('Erro ao despublicar flow');
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

  const openEditForm = (flow: any) => {
    setCurrentFlow(flow);
    setShowFlowForm(true);
  };

  const openFlowEditor = (flow: any) => {
    setCurrentFlow(flow);
    setShowFlowEditor(true);
  };

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Flows</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Flows</h1>
        </div>
        <div className="text-center py-12">
          <div className="text-red-600 text-lg font-semibold">Erro ao carregar organização</div>
          <p className="mt-2 text-gray-600">{orgError}</p>
        </div>
      </div>
    );
  }

  if (showFlowForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {currentFlow?.id ? 'Editar Flow' : 'Criar Novo Flow'}
          </h1>
          <button
            onClick={() => setShowFlowForm(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); saveFlow(currentFlow!); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome do Flow</label>
            <input
              type="text"
              value={currentFlow?.name || ''}
              onChange={(e) => setCurrentFlow({ ...currentFlow!, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowFlowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {currentFlow?.id ? 'Atualizar' : 'Criar'} Flow
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (showFlowEditor) {
    if (!currentFlow) {
      // Se não há currentFlow mas está tentando abrir o editor, fechar o editor
      setShowFlowEditor(false);
      return null;
    }

    return (
              <FlowEditor
          flow={currentFlow}
          onSave={async () => {
            // Recarregar a lista de flows após salvar
            await loadFlows();
            // Fechar o editor
            setShowFlowEditor(false);
            setCurrentFlow(null);
            console.log('Flow salvo com sucesso!');
          }}
          onCancel={() => setShowFlowEditor(false)}
          categories={categories}
          nodeTypes={nodeTypes}
        />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Flows</h1>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Criar Novo Flow
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando flows...</p>
        </div>
      ) : flows.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum flow encontrado</h3>
          <p className="text-gray-600 mb-6">Crie seu primeiro flow para começar a automatizar processos</p>
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Criar Primeiro Flow
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <div key={flow.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{flow.name}</h3>
                  <p className="text-sm text-gray-500">Versão {flow.version}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  flow.status === 'published' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {flow.status === 'published' ? 'Publicado' : 'Rascunho'}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Nós:</span> {flow.graph?.nodes?.length || 0}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Conexões:</span> {flow.graph?.edges?.length || 0}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openFlowEditor(flow)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Editar
                </button>
                <button
                  onClick={() => openEditForm(flow)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Configurar
                </button>
                {flow.status === 'draft' && (
                  <button
                    onClick={() => publishFlow(flow.id!)}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Publicar
                  </button>
                )}
                {flow.status === 'published' && (
                  <>
                    <button
                      onClick={() => validateFlow(flow.id!)}
                      className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    >
                      Validar
                    </button>
                    <button
                      onClick={() => unpublishFlow(flow.id!)}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                    >
                      Voltar para Rascunho
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteFlow(flow.id!)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente do Editor de Flow
function FlowEditor({ flow, onSave, onCancel, categories, nodeTypes }: { 
  flow: any; 
  onSave: () => void; 
  onCancel: () => void;
  categories: string[];
  nodeTypes: any[];
}) {
  // Verificação de segurança
  if (!flow) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Erro: Flow não encontrado</div>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(flow.graph?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.graph?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showXMLPreview, setShowXMLPreview] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback((nodeType: string, position?: { x: number; y: number }) => {
    const nodeTypeInfo = nodeTypes.find(nt => nt.type === nodeType);
    if (!nodeTypeInfo) {
      console.error('Tipo de nó não encontrado:', nodeType);
      return;
    }
    
    // Se for um nó start, verificar se já existe
    if (nodeType === 'start') {
      const existingStart = nodes.find(n => n.data.nodeType === 'start');
      if (existingStart) {
        alert('Já existe um nó Start no flow. O nó Start deve ser único e sempre o primeiro.');
        return;
      }
    }
    
    const newNode: Node = {
      id: `${nodeTypeInfo.type}-${Date.now()}`,
      type: 'default',
      position: position || { x: 100, y: 100 },
      data: {
        label: nodeTypeInfo.label,
        nodeType: nodeTypeInfo.type,
        ...nodeTypeInfo.configProps?.reduce((acc: any, prop: any) => {
          acc[prop.name] = prop.default;
          return acc;
        }, {})
      }
    };
    
    console.log('🎯 Novo nó criado:', newNode);
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, nodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) {
      console.error('ReactFlow bounds não encontrados');
      return;
    }

    const data = event.dataTransfer.getData('application/reactflow');
    if (!data) {
      console.error('Dados de drag não encontrados');
      return;
    }

    try {
      const nodeData = JSON.parse(data);
      console.log('Dados do nó recebidos:', nodeData);
      
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      console.log('Posição calculada:', position);
      addNode(nodeData.type, position);
    } catch (error) {
      console.error('Erro ao processar dados do nó:', error);
    }
  }, [addNode]);

  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedFlow = JSON.parse(e.target?.result as string);
        setNodes(importedFlow.graph.nodes);
        setEdges(importedFlow.graph.edges);
        setSelectedNode(null); // Limpar seleção ao importar
        alert('Flow importado com sucesso!');
      } catch (error) {
        console.error('Erro ao importar flow:', error);
        alert('Erro ao importar flow: Formato inválido ou arquivo vazio.');
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges]);

  const exportFlow = useCallback((flow: any, nodes: Node[], edges: Edge[]) => {
    const flowData = {
      name: flow.name,
      organizationId: flow.organizationId,
      status: flow.status,
      version: flow.version,
      graph: {
        nodes: nodes,
        edges: edges
      }
    };
    const jsonString = JSON.stringify(flowData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flow.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Flow exportado com sucesso!');
  }, []);



  const duplicateNode = useCallback((node: Node) => {
    const nodeTypeInfo = nodeTypes.find(nt => nt.type === node.data.nodeType);
    if (!nodeTypeInfo) {
      console.error('Tipo de nó não encontrado para duplicação:', node.data.nodeType);
      return;
    }

    const newNode: Node = {
      id: `${nodeTypeInfo.type}-${Date.now()}`,
      type: 'default',
      position: { x: node.position.x + 100, y: node.position.y + 100 }, // Duplica a posição
      data: {
        label: `${node.data.label} (Cópia)`,
        nodeType: nodeTypeInfo.type,
        ...nodeTypeInfo.configProps?.reduce((acc: any, prop: any) => {
          acc[prop.name] = prop.default;
          return acc;
        }, {})
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
  }, [setNodes]);

  // Função para atualizar dados de um nó
  const updateNode = useCallback((nodeId: string, data: any) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
  }, [setNodes]);

  // Função para deletar um nó
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter(node => node.id !== nodeId));
    setEdges((eds) => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  // Função para selecionar um nó
  const selectNode = useCallback((node: Node) => {
    setSelectedNode(node);
  }, []);

  // Função para deployar no FreeSWITCH
  const deployToFreeSwitch = useCallback(async () => {
    const xml = generateFreeSwitchXML(flow, nodes, edges, nodeTypes);
    console.log('Deployando para FreeSwitch:', xml);
    
    const result = await saveToFreeSwitch(flow, xml);
    if (result.success) {
      alert('Flow deployado no FreeSWITCH com sucesso!');
      return { success: true, data: result.data };
    } else {
      alert(`Erro ao deployar no FreeSWITCH: ${result.error}`);
      return { success: false, error: result.error };
    }
  }, [flow, nodes, edges, nodeTypes]);

  const cleanOrphanNodes = useCallback((nodes: Node[], edges: Edge[]) => {
    const nodeIds = new Set(edges.map(edge => edge.source).concat(edges.map(edge => edge.target)));
    return nodes.filter(node => nodeIds.has(node.id));
  }, []);

  const renderConfigFields = useCallback((nodeType: typeof nodeTypes[0], node: Node, setNodes: React.Dispatch<React.SetStateAction<Node[]>>) => {
    const configProps = nodeType.configProps || [];
    const nodeData = node.data;

    return (
      <div className="space-y-4">
        {configProps.map((prop: any) => {
          const value = nodeData[prop.name];
          const isBoolean = prop.type === 'boolean';
          const isSelect = prop.type === 'select';
          const isArray = prop.type === 'array';

          const renderInput = () => {
            if (isBoolean) {
              return (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value === true}
                    onChange={(e) => setNodes((nds: Node[]) => nds.map((n: Node) => n.id === node.id ? { ...n, data: { ...n.data, [prop.name]: e.target.checked } } : n))}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{prop.label}</span>
                </div>
              );
            }

            if (isSelect) {
              return (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{prop.label}</label>
                  <select
                    value={value || ''}
                    onChange={(e) => setNodes((nds: Node[]) => nds.map((n: Node) => n.id === node.id ? { ...n, data: { ...n.data, [prop.name]: e.target.value } } : n))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {(prop as any).options?.map((option: string) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              );
            }

            if (isArray) {
              return (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{prop.label}</label>
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => setNodes((nds: Node[]) => nds.map((n: Node) => n.id === node.id ? { ...n, data: { ...n.data, [prop.name]: e.target.value } } : n))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">Ex: key1=value1,key2=value2</p>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{prop.label}</label>
                <input
                  type="text"
                  value={value || ''}
                  onChange={(e) => setNodes((nds: Node[]) => nds.map((n: Node) => n.id === node.id ? { ...n, data: { ...n.data, [prop.name]: e.target.value } } : n))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            );
          };

          return (
            <div key={prop.name} className="space-y-2">
              {renderInput()}
            </div>
          );
        })}
      </div>
    );
  }, [nodeTypes]);

  const saveFlow = async () => {
    // Mapear nós para o formato esperado pelo backend
    const mappedNodes = nodes.map(node => ({
      ...node,
      type: node.data?.nodeType || 'default', // Usar nodeType como tipo principal
      data: {
        ...node.data,
        type: node.data?.nodeType || 'default' // Garantir que o tipo está na data também
      }
    }));

    const updatedFlow = {
      ...flow,
      graph: {
        nodes: mappedNodes,
        edges: edges
      },
      // Incluir XML do FreeSwitch no flow
      freeswitch_xml: generateFreeSwitchXML(flow, nodes, edges, nodeTypes)
    };
    
    // Salvar no backend (que pode salvar no FreeSwitch também)
    const backendResult = await saveFlowToBackend(updatedFlow);
    if (!backendResult.success) {
      alert(`Erro ao salvar flow: ${backendResult.error}`);
      return;
    }
    
    // Simular deploy no FreeSwitch
    const freeswitchResult = await saveToFreeSwitch(updatedFlow, updatedFlow.freeswitch_xml);
    if (freeswitchResult.success) {
      console.log('Flow deployado no FreeSwitch com sucesso!');
    } else {
      console.error('Erro ao deployar no FreeSwitch:', freeswitchResult.error);
      // Não bloquear o salvamento se o FreeSwitch falhar
    }
    
    // Salvar no Supabase também
    const supabaseResult = await saveToSupabase(updatedFlow, mappedNodes, edges);
    if (supabaseResult.success) {
      console.log('Flow salvo no Supabase com sucesso!');
    } else {
      console.error('Erro ao salvar no Supabase:', supabaseResult.error);
      // Não bloquear o salvamento se o Supabase falhar
    }
    
    onSave();
  };

  // Função para salvar no Supabase
  const saveToSupabase = async (flow: any, nodes: Node[], edges: Edge[]) => {
    try {
      // Aqui você integraria com o Supabase
      const flowData = {
        id: flow.id,
        name: flow.name,
        organizationId: flow.organizationId,
        status: flow.status,
        version: flow.version,
        graph: { nodes, edges },
        freeswitch_xml: generateFreeSwitchXML(flow, nodes, edges, nodeTypes),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Salvando no Supabase:', flowData);
      
      // Simular salvamento no Supabase
      // const { data, error } = await supabase
      //   .from('flows')
      //   .upsert(flowData);
      
      return { success: true, data: flowData };
    } catch (error) {
      console.error('Erro ao salvar no Supabase:', error);
      return { success: false, error };
    }
  };

  const saveFlowToBackend = async (flowData: any) => {
    try {
      const url = flow.id 
        ? `http://localhost:4000/flows/${flow.organizationId}/${flow.id}`
        : `http://localhost:4000/flows/${flow.organizationId}`;
      
      const response = await fetch(url, {
        method: flow.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowData)
      });
      
      if (response.ok) {
        return { success: true, data: await response.json() };
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        return { success: false, error: errorData.message };
      }
    } catch (error) {
      console.error('Error saving flow to backend:', error);
      return { success: false, error: 'Network error' };
    }
  };



  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
          <div>
              <h2 className="text-2xl font-bold text-gray-900">Flow Editor: {flow.name}</h2>
              <p className="text-sm text-gray-600 mt-1">Arraste nós da barra lateral para criar seu fluxo IVR</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowXMLPreview(!showXMLPreview)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  showXMLPreview 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showXMLPreview ? 'Ocultar XML' : 'Pré-visualizar XML'}
              </button>
              <button
                onClick={() => {
                  setNodes([]);
                  setEdges([]);
                }}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Limpar
              </button>
              <button
                onClick={deployToFreeSwitch}
                className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Deployar
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveFlow}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Salvar Flow
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r flex flex-col h-full">
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              <div className="p-3 space-y-3 pb-32">
                {categories.map(category => (
                  <div key={category} className="space-y-1.5">
                    <h4 className="text-sm font-medium text-gray-700 text-left bg-gray-50 py-1 px-1">
                      {category}
                    </h4>
                    <div className="space-y-1">
                      {nodeTypes
                        .filter(nt => nt.category === category)
                        .map(nodeType => (
                          <div
                            key={nodeType.type}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('application/reactflow', JSON.stringify({
                                type: nodeType.type,
                                label: nodeType.label,
                                color: nodeType.color
                              }));
                              e.dataTransfer.effectAllowed = 'move';
                              console.log('Drag iniciado para:', nodeType.type);
                            }}
                            className="p-2 bg-white rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all duration-200 select-none"
                          >
                            <div className="flex items-center space-x-2">
                              {nodeType.icon && (
                                <div className="text-gray-600">
                                  {nodeType.icon}
                                </div>
                              )}
                              <div className="text-sm font-medium text-gray-900">{nodeType.label}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div 
            className="flex-1 bg-gray-50 relative overflow-hidden"
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => selectNode(node)}
              fitView
              fitViewOptions={{ padding: 0.1 }}
              minZoom={0.5}
              maxZoom={1.5}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              deleteKeyCode="Delete"
              multiSelectionKeyCode="Shift"
              snapToGrid
              snapGrid={[20, 20]}
              className="bg-gray-50"
              nodesDraggable={true}
              nodesConnectable={true}
              elementsSelectable={true}
              panOnDrag={true}
              zoomOnScroll={true}
              zoomOnPinch={true}
              panOnScroll={false}
            >
              <Controls 
                className="bg-white border border-gray-200 rounded-lg shadow-sm" 
                position="top-right"
              />
              <Background variant={BackgroundVariant.Dots} color="#6b7280" className="opacity-30" />
              <MiniMap 
                nodeColor="#3b82f6"
                nodeStrokeWidth={2}
                zoomable
                pannable
                className="bg-white border border-gray-200 rounded-lg shadow-sm"
                style={{ 
                  width: 140, 
                  height: 80,
                  position: 'absolute',
                  bottom: '100px',
                  right: '20px',
                  zIndex: 10
                }}
              />
            </ReactFlow>
          </div>

          {/* Painel de Configuração do Nó */}
          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onUpdateNode={updateNode}
              onDeleteNode={deleteNode}
              onDuplicateNode={duplicateNode}
              nodeTypes={nodeTypes}
            />
          )}

          {/* Pré-visualização XML */}
          {showXMLPreview && (
            <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
              <FlowXMLPreview
                flow={flow}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onDeploy={deployToFreeSwitch}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
