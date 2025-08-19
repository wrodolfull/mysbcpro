'use client';

import { useState, useEffect } from 'react';
import { Node, Edge } from 'reactflow';

interface FlowXMLPreviewProps {
  flow: any;
  nodes: Node[];
  edges: Edge[];
  nodeTypes: any[];
  onDeploy: () => void;
}

export default function FlowXMLPreview({ 
  flow, 
  nodes, 
  edges, 
  nodeTypes,
  onDeploy 
}: FlowXMLPreviewProps) {
  const [xmlOutput, setXmlOutput] = useState<string>('');
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    generateXML();
    validateFlow();
  }, [flow, nodes, edges]);

  const generateXML = () => {
    if (!flow || !nodes.length) {
      setXmlOutput('');
      return;
    }

    const flowName = flow.name.toLowerCase().replace(/\s+/g, '_');
    
    let xml = `<context name="default">\n`;
    xml += `  <extension name="${flowName}-flow">\n`;
    xml += `    <condition field="destination_number" expression="^7000$">\n\n`;
    
    // Processar nós em ordem
    const sortedNodes = sortNodesByPosition(nodes);
    
    sortedNodes.forEach((node, index) => {
      const nodeData = node.data;
      const nodeType = nodeTypes.find(nt => nt.type === nodeData.nodeType);
      
      if (nodeType) {
        xml += `      <!-- ${nodeData.label} -->\n`;
        
        switch (nodeType.type) {
          case 'start':
            xml += `      <!-- Start -->\n`;
            xml += `      <action application="set" data="organizationID=\${domain_uuid}"/>\n`;
            break;
            
          case 'answer':
            if (nodeData.enabled !== false) {
              xml += `      <action application="answer"/>\n`;
            }
            break;
            
          case 'set_defaults':
            xml += `      <action application="set" data="organizationID=${flow.organizationId || '${organizationID}'}"/>\n`;
            xml += `      <action application="set" data="AUDIO_BASE=/usr/local/freeswitch/recordings/\${organizationID}"/>\n`;
            
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
    
    setXmlOutput(xml);
  };

  const validateFlow = () => {
    const errors: string[] = [];
    
    if (!flow.name) {
      errors.push('Nome do flow é obrigatório');
    }
    
    if (nodes.length === 0) {
      errors.push('Flow deve ter pelo menos um nó');
    }
    
    // Validar se o nó start está presente e é o primeiro
    const startNode = nodes.find(n => n.data.nodeType === 'start');
    if (!startNode) {
      errors.push('Flow deve ter um nó Start obrigatório');
    } else {
      // Verificar se o start é o primeiro nó (posição Y mais alta)
      const sortedNodes = sortNodesByPosition(nodes);
      if (sortedNodes[0]?.data.nodeType !== 'start') {
        errors.push('Nó Start deve ser sempre o primeiro nó do flow');
      }
    }
    
    // Validar nós individuais
    nodes.forEach((node, index) => {
      const nodeData = node.data;
      const nodeType = nodeTypes.find(nt => nt.type === nodeData.nodeType);
      
      if (!nodeType) {
        errors.push(`Nó ${index + 1}: Tipo de nó inválido`);
        return;
      }
      
      // Validar campos obrigatórios
      if (nodeType.configProps) {
        nodeType.configProps.forEach((prop: any) => {
          if (prop.required && !nodeData[prop.name]) {
            errors.push(`Nó ${nodeData.label}: Campo "${prop.label}" é obrigatório`);
          }
        });
      }
    });
    
    // Validar conectividade
    if (nodes.length > 1 && edges.length === 0) {
      errors.push('Flow deve ter conexões entre os nós');
    }
    
    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  };

  const sortNodesByPosition = (nodes: Node[]) => {
    return [...nodes].sort((a, b) => {
      // O nó start deve sempre ser o primeiro
      if (a.data.nodeType === 'start') return -1;
      if (b.data.nodeType === 'start') return 1;
      
      // Para outros nós, ordenar por posição
      if (Math.abs(a.position.y - b.position.y) < 50) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(xmlOutput);
      alert('XML copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar:', err);
      alert('Erro ao copiar XML');
    }
  };

  const downloadXML = () => {
    const blob = new Blob([xmlOutput], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flow.name.toLowerCase().replace(/\s+/g, '_')}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {!isValid && validationErrors.length > 0 && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <h4 className="text-sm font-medium text-red-800 mb-2">Erros de Validação:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* XML Output */}
      <div className="p-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">XML do FreeSWITCH</h4>
            <div className="text-xs text-gray-500">
              {nodes.length} nós, {edges.length} conexões
            </div>
          </div>
          
          <pre className="bg-white p-4 rounded border text-xs text-gray-800 overflow-x-auto max-h-96 overflow-y-auto">
            <code>{xmlOutput || '<!-- Nenhum nó configurado -->'}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
