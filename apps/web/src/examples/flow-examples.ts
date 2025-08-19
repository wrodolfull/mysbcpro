import { Node, Edge } from 'reactflow';

// Exemplo 1: IVR Simples de Atendimento
export const simpleIVRFlow = {
  name: 'IVR Simples',
  description: 'IVR básico com menu de opções - Começa sempre com o nó Start',
  nodes: [
    {
      id: 'start-1',
      type: 'default',
      position: { x: 100, y: 50 }, // Posição Y mais alta para ser o primeiro
      data: {
        label: 'Start',
        nodeType: 'start'
      }
    },
    {
      id: 'answer-1',
      type: 'default',
      position: { x: 100, y: 200 },
      data: {
        label: 'Answer',
        nodeType: 'answer',
        enabled: true
      }
    },
    {
      id: 'playback-1',
      type: 'default',
      position: { x: 100, y: 300 },
      data: {
        label: 'Play Audio',
        nodeType: 'play_audio',
        file: 'bem_vindo.wav'
      }
    },
    {
      id: 'collect-digits-1',
      type: 'default',
      position: { x: 100, y: 400 },
      data: {
        label: 'Collect Digits',
        nodeType: 'collect_digits',
        varName: 'OPCAO',
        min: 1,
        max: 1,
        tries: 3,
        timeoutMs: 5000,
        terminator: '#',
        prompt: 'menu_opcoes.wav',
        invalidPrompt: 'opcao_invalida.wav'
      }
    },
    {
      id: 'branch-1',
      type: 'default',
      position: { x: 100, y: 500 },
      data: {
        label: 'Branch By Status',
        nodeType: 'branch_by_status',
        statusVar: 'OPCAO',
        okPath: '1',
        notFoundPath: '2',
        errorPath: '3'
      }
    },
    {
      id: 'transfer-1',
      type: 'default',
      position: { x: 300, y: 600 },
      data: {
        label: 'Transfer',
        nodeType: 'transfer',
        destination: '1000 XML default'
      }
    },
    {
      id: 'callcenter-1',
      type: 'default',
      position: { x: 100, y: 600 },
      data: {
        label: 'Call Center',
        nodeType: 'callcenter',
        queue: 'atendimento@default'
      }
    },
    {
      id: 'hangup-1',
      type: 'default',
      position: { x: -100, y: 600 },
      data: {
        label: 'Hangup',
        nodeType: 'hangup',
        cause: 'NORMAL_CLEARING'
      }
    }
  ] as Node[],
  edges: [
    {
      id: 'e1-2',
      source: 'start-1',
      target: 'answer-1'
    },
    {
      id: 'e2-3',
      source: 'answer-1',
      target: 'playback-1'
    },
    {
      id: 'e3-4',
      source: 'playback-1',
      target: 'collect-digits-1'
    },
    {
      id: 'e4-5',
      source: 'collect-digits-1',
      target: 'branch-1'
    },
    {
      id: 'e5-6',
      source: 'branch-1',
      target: 'transfer-1'
    },
    {
      id: 'e5-7',
      source: 'branch-1',
      target: 'callcenter-1'
    },
    {
      id: 'e5-8',
      source: 'branch-1',
      target: 'hangup-1'
    }
  ] as Edge[]
};

// Exemplo 2: IVR com Validação de CPF
export const cpfValidationFlow = {
  name: 'Validação de CPF',
  description: 'IVR que coleta e valida CPF',
  nodes: [
    {
      id: 'start-1',
      type: 'default',
      position: { x: 100, y: 100 },
      data: {
        label: 'Start',
        nodeType: 'start'
      }
    },
    {
      id: 'answer-1',
      type: 'default',
      position: { x: 100, y: 200 },
      data: {
        label: 'Answer',
        nodeType: 'answer',
        enabled: true
      }
    },
    {
      id: 'set-defaults-1',
      type: 'default',
      position: { x: 100, y: 300 },
      data: {
        label: 'Set Defaults',
        nodeType: 'set_defaults',
        organizationID: 'empresa_123',
        extraVars: 'timeout=30,retries=3'
      }
    },
    {
      id: 'playback-1',
      type: 'default',
      position: { x: 100, y: 400 },
      data: {
        label: 'Play Audio',
        nodeType: 'play_audio',
        file: 'digite_cpf.wav'
      }
    },
    {
      id: 'collect-digits-1',
      type: 'default',
      position: { x: 100, y: 500 },
      data: {
        label: 'Collect Digits',
        nodeType: 'collect_digits',
        varName: 'CPF_INPUT',
        min: 11,
        max: 11,
        tries: 3,
        timeoutMs: 10000,
        terminator: '#',
        prompt: 'digite_cpf.wav',
        invalidPrompt: 'cpf_invalido.wav'
      }
    },
    {
      id: 'sanitize-1',
      type: 'default',
      position: { x: 100, y: 600 },
      data: {
        label: 'Sanitize Digits',
        nodeType: 'sanitize_digits',
        sourceVar: 'CPF_INPUT',
        targetVar: 'CPF_CLEAN'
      }
    },
    {
      id: 'validate-1',
      type: 'default',
      position: { x: 100, y: 700 },
      data: {
        label: 'Validate With Script',
        nodeType: 'validate_with_script',
        language: 'lua',
        script: 'validate_cpf.lua',
        args: '${CPF_CLEAN}'
      }
    },
    {
      id: 'feedback-1',
      type: 'default',
      position: { x: 100, y: 800 },
      data: {
        label: 'Feedback While Validating',
        nodeType: 'feedback_while_validating',
        file: 'validando.wav'
      }
    },
    {
      id: 'branch-1',
      type: 'default',
      position: { x: 100, y: 900 },
      data: {
        label: 'Branch By Status',
        nodeType: 'branch_by_status',
        statusVar: 'validation_status',
        okPath: 'OK',
        notFoundPath: 'INVALID',
        errorPath: 'ERROR'
      }
    },
    {
      id: 'success-1',
      type: 'default',
      position: { x: 300, y: 1000 },
      data: {
        label: 'Play Audio Success',
        nodeType: 'play_audio',
        file: 'cpf_valido.wav'
      }
    },
    {
      id: 'transfer-1',
      type: 'default',
      position: { x: 300, y: 1100 },
      data: {
        label: 'Transfer',
        nodeType: 'transfer',
        destination: '2000 XML default'
      }
    },
    {
      id: 'error-1',
      type: 'default',
      position: { x: 100, y: 1000 },
      data: {
        label: 'Play Audio Error',
        nodeType: 'play_audio',
        file: 'cpf_invalido.wav'
      }
    },
    {
      id: 'hangup-1',
      type: 'default',
      position: { x: 100, y: 1100 },
      data: {
        label: 'Hangup',
        nodeType: 'hangup',
        cause: 'NORMAL_CLEARING'
      }
    }
  ] as Node[],
  edges: [
    {
      id: 'e1-2',
      source: 'start-1',
      target: 'answer-1'
    },
    {
      id: 'e2-3',
      source: 'answer-1',
      target: 'set-defaults-1'
    },
    {
      id: 'e3-4',
      source: 'set-defaults-1',
      target: 'playback-1'
    },
    {
      id: 'e4-5',
      source: 'playback-1',
      target: 'collect-digits-1'
    },
    {
      id: 'e5-6',
      source: 'collect-digits-1',
      target: 'sanitize-1'
    },
    {
      id: 'e6-7',
      source: 'sanitize-1',
      target: 'validate-1'
    },
    {
      id: 'e7-8',
      source: 'validate-1',
      target: 'feedback-1'
    },
    {
      id: 'e8-9',
      source: 'feedback-1',
      target: 'branch-1'
    },
    {
      id: 'e9-10',
      source: 'branch-1',
      target: 'success-1'
    },
    {
      id: 'e10-11',
      source: 'success-1',
      target: 'transfer-1'
    },
    {
      id: 'e9-12',
      source: 'branch-1',
      target: 'error-1'
    },
    {
      id: 'e12-13',
      source: 'error-1',
      target: 'hangup-1'
    }
  ] as Edge[]
};

// Exemplo 3: IVR com Fallback para Fila
export const fallbackQueueFlow = {
  name: 'IVR com Fallback',
  description: 'IVR que oferece opção de fallback para fila',
  nodes: [
    {
      id: 'start-1',
      type: 'default',
      position: { x: 100, y: 100 },
      data: {
        label: 'Start',
        nodeType: 'start'
      }
    },
    {
      id: 'answer-1',
      type: 'default',
      position: { x: 100, y: 200 },
      data: {
        label: 'Answer',
        nodeType: 'answer',
        enabled: true
      }
    },
    {
      id: 'playback-1',
      type: 'default',
      position: { x: 100, y: 300 },
      data: {
        label: 'Play Audio',
        nodeType: 'play_audio',
        file: 'bem_vindo_sistema.wav'
      }
    },
    {
      id: 'collect-digits-1',
      type: 'default',
      position: { x: 100, y: 400 },
      data: {
        label: 'Collect Digits',
        nodeType: 'collect_digits',
        varName: 'OPCAO',
        min: 1,
        max: 1,
        tries: 3,
        timeoutMs: 5000,
        terminator: '#',
        prompt: 'menu_principal.wav',
        invalidPrompt: 'opcao_invalida.wav'
      }
    },
    {
      id: 'branch-1',
      type: 'default',
      position: { x: 100, y: 500 },
      data: {
        label: 'Branch By Status',
        nodeType: 'branch_by_status',
        statusVar: 'OPCAO',
        okPath: '1',
        notFoundPath: '2',
        errorPath: '3'
      }
    },
    {
      id: 'transfer-1',
      type: 'default',
      position: { x: 300, y: 600 },
      data: {
        label: 'Transfer',
        nodeType: 'transfer',
        destination: '1000 XML default'
      }
    },
    {
      id: 'offer-fallback-1',
      type: 'default',
      position: { x: 100, y: 600 },
      data: {
        label: 'Offer Fallback',
        nodeType: 'offer_fallback',
        notFoundFile: 'nao_encontrado.wav',
        optionPromptFile: 'opcao_fallback.wav',
        fallbackQueue: 'suporte@default',
        fallbackGateway: ''
      }
    },
    {
      id: 'hangup-1',
      type: 'default',
      position: { x: -100, y: 600 },
      data: {
        label: 'Hangup',
        nodeType: 'hangup',
        cause: 'NORMAL_CLEARING'
      }
    }
  ] as Node[],
  edges: [
    {
      id: 'e1-2',
      source: 'start-1',
      target: 'answer-1'
    },
    {
      id: 'e2-3',
      source: 'answer-1',
      target: 'playback-1'
    },
    {
      id: 'e3-4',
      source: 'playback-1',
      target: 'collect-digits-1'
    },
    {
      id: 'e4-5',
      source: 'collect-digits-1',
      target: 'branch-1'
    },
    {
      id: 'e5-6',
      source: 'branch-1',
      target: 'transfer-1'
    },
    {
      id: 'e5-7',
      source: 'branch-1',
      target: 'offer-fallback-1'
    },
    {
      id: 'e5-8',
      source: 'branch-1',
      target: 'hangup-1'
    }
  ] as Edge[]
};

// Função para carregar um exemplo
export const loadFlowExample = (exampleName: string) => {
  switch (exampleName) {
    case 'simple':
      return simpleIVRFlow;
    case 'cpf-validation':
      return cpfValidationFlow;
    case 'fallback-queue':
      return fallbackQueueFlow;
    default:
      return simpleIVRFlow;
  }
};

// Lista de exemplos disponíveis
export const availableExamples = [
  {
    id: 'simple',
    name: 'IVR Simples',
    description: 'IVR básico com menu de opções',
    complexity: 'Baixa'
  },
  {
    id: 'cpf-validation',
    name: 'Validação de CPF',
    description: 'IVR que coleta e valida CPF',
    complexity: 'Média'
  },
  {
    id: 'fallback-queue',
    name: 'IVR com Fallback',
    description: 'IVR que oferece opção de fallback para fila',
    complexity: 'Média'
  }
];
