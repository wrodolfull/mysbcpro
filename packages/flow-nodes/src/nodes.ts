import { z } from 'zod';
import type { FlowGraphDTO, FlowNodeBase } from '@mysbc/shared';
import { InMemoryFlowNodesRegistry, type FlowNodeDefinition } from './sdk';

const required = <T extends Record<string, any>>(shape: T) => z.object(shape).strict();

const startDef: FlowNodeDefinition = { type: 'start', label: 'Start' };
const endDef: FlowNodeDefinition = { type: 'end', label: 'End' };

const playAudioDef: FlowNodeDefinition = {
  type: 'play_audio',
  label: 'Play Audio',
  inputSchema: required({ file: z.string().min(1) }),
  validate: (node) => {
    if (!node.data || !(node.data as any).file) throw new Error('play_audio requires existing file');
  }
};

const ttsDef: FlowNodeDefinition = {
  type: 'tts',
  label: 'TTS',
  inputSchema: required({ text: z.string().min(1) }),
};

const ivrCaptureDef: FlowNodeDefinition = {
  type: 'ivr_capture',
  label: 'IVR Capture',
  inputSchema: required({
    prompt: z.string().min(1),
    minDigits: z.number().int().min(1),
    maxDigits: z.number().int().min(1),
    timeoutMs: z.number().int().min(100),
    tries: z.number().int().min(1),
    regex: z.string().optional(),
    onFail: z.string().min(1),
    onTimeout: z.string().min(1)
  }),
  validate: (node: FlowNodeBase, graph: FlowGraphDTO) => {
    const data = (node.data ?? {}) as any;
    if (!data.prompt) throw new Error('ivr_capture requires audio/tts prompt');
    if (!data.minDigits || !data.maxDigits) throw new Error('ivr_capture requires min/max_digits');
    const targets = new Set(graph.edges.filter(e => e.source === node.id).map(e => e.target));
    if (!targets.has(data.onFail) || !targets.has(data.onTimeout)) {
      throw new Error('ivr_capture must define fail/timeout targets');
    }
  }
};

const forwardDef: FlowNodeDefinition = {
  type: 'forward',
  label: 'Forward',
  inputSchema: required({ destination: z.string().min(1) }),
  validate: (node) => {
    const d = (node.data ?? {}) as any;
    if (!d.destination) throw new Error('forward requires a destination');
  }
};

// Novos tipos de nós para FreeSWITCH
const answerDef: FlowNodeDefinition = {
  type: 'answer',
  label: 'Answer',
  inputSchema: required({ enabled: z.boolean() }),
  validate: (node) => {
    // Validação básica - answer sempre é válido
  }
};

// Removido - usando play_audio em seu lugar

const setDefaultsDef: FlowNodeDefinition = {
  type: 'set_defaults',
  label: 'Set Defaults',
  inputSchema: required({ 
    organizationID: z.string().optional(),
    extraVars: z.string().optional()
  }),
  validate: (node) => {
    // Validação básica - set_defaults sempre é válido
  }
};

const collectDigitsDef: FlowNodeDefinition = {
  type: 'collect_digits',
  label: 'Collect Digits',
  inputSchema: required({
    varName: z.string().min(1),
    min: z.number().int().min(1),
    max: z.number().int().min(1),
    tries: z.number().int().min(1),
    timeoutMs: z.number().int().min(100),
    terminator: z.string().min(1),
    prompt: z.string().min(1),
    invalidPrompt: z.string().min(1)
  }),
  validate: (node) => {
    const data = (node.data ?? {}) as any;
    if (!data.varName) throw new Error('collect_digits requires variable name');
    if (!data.prompt) throw new Error('collect_digits requires prompt file');
  }
};

const sanitizeDigitsDef: FlowNodeDefinition = {
  type: 'sanitize_digits',
  label: 'Sanitize Digits',
  inputSchema: required({
    sourceVar: z.string().min(1),
    targetVar: z.string().min(1)
  }),
  validate: (node) => {
    const data = (node.data ?? {}) as any;
    if (!data.sourceVar || !data.targetVar) throw new Error('sanitize_digits requires source and target variables');
  }
};

const validateWithScriptDef: FlowNodeDefinition = {
  type: 'validate_with_script',
  label: 'Validate With Script',
  inputSchema: required({
    language: z.string().min(1),
    script: z.string().min(1),
    args: z.string().min(1)
  }),
  validate: (node) => {
    const data = (node.data ?? {}) as any;
    if (!data.script) throw new Error('validate_with_script requires script file');
  }
};

const feedbackWhileValidatingDef: FlowNodeDefinition = {
  type: 'feedback_while_validating',
  label: 'Feedback While Validating',
  inputSchema: required({ file: z.string().min(1) }),
  validate: (node) => {
    if (!node.data || !(node.data as any).file) throw new Error('feedback_while_validating requires file path');
  }
};

const branchByStatusDef: FlowNodeDefinition = {
  type: 'branch_by_status',
  label: 'Branch By Status',
  inputSchema: required({
    statusVar: z.string().min(1),
    okPath: z.string().min(1),
    notFoundPath: z.string().min(1),
    errorPath: z.string().min(1)
  }),
  validate: (node) => {
    const data = (node.data ?? {}) as any;
    if (!data.statusVar) throw new Error('branch_by_status requires status variable');
  }
};

const routeResultDef: FlowNodeDefinition = {
  type: 'route_result',
  label: 'Route Result',
  inputSchema: required({
    resultVar: z.string().min(1),
    successPath: z.string().min(1),
    failurePath: z.string().min(1)
  }),
  validate: (node) => {
    const data = (node.data ?? {}) as any;
    if (!data.resultVar) throw new Error('route_result requires result variable');
  }
};

const offerFallbackDef: FlowNodeDefinition = {
  type: 'offer_fallback',
  label: 'Offer Fallback',
  inputSchema: required({
    prompt: z.string().min(1),
    yesPath: z.string().min(1),
    noPath: z.string().min(1)
  }),
  validate: (node) => {
    const data = (node.data ?? {}) as any;
    if (!data.prompt) throw new Error('offer_fallback requires prompt file');
  }
};

const transferDef: FlowNodeDefinition = {
  type: 'transfer',
  label: 'Transfer',
  inputSchema: required({ destination: z.string().min(1) }),
  validate: (node) => {
    const data = (node.data ?? {}) as any;
    if (!data.destination) throw new Error('transfer requires destination');
  }
};

const bridgeDef: FlowNodeDefinition = {
  type: 'bridge',
  label: 'Bridge',
  inputSchema: required({ destination: z.string().min(1) }),
  validate: (node) => {
    const data = (node.data ?? {}) as any;
    if (!data.destination) throw new Error('bridge requires destination');
  }
};

const callcenterDef: FlowNodeDefinition = {
  type: 'callcenter',
  label: 'Call Center',
  inputSchema: required({ queue: z.string().min(1) }),
  validate: (node) => {
    const data = (node.data ?? {}) as any;
    if (!data.queue) throw new Error('callcenter requires queue name');
  }
};

const hangupDef: FlowNodeDefinition = {
  type: 'hangup',
  label: 'Hangup',
  inputSchema: required({ cause: z.string().min(1) }),
  validate: (node) => {
    const data = (node.data ?? {}) as any;
    if (!data.cause) throw new Error('hangup requires cause');
  }
};

const businessHoursDef: FlowNodeDefinition = { type: 'business_hours', label: 'Business Hours' };
const recordCallDef: FlowNodeDefinition = { type: 'record_call', label: 'Record Call' };
const asrSttDef: FlowNodeDefinition = { type: 'asr_stt', label: 'ASR/STT' };
const crmConditionDef: FlowNodeDefinition = { type: 'crm_condition', label: 'CRM Condition' };
const httpRequestDef: FlowNodeDefinition = { type: 'http_request', label: 'HTTP Request' };
const queueDef: FlowNodeDefinition = { type: 'queue', label: 'Queue' };
const voicemailDef: FlowNodeDefinition = { type: 'voicemail', label: 'Voicemail' };
const surveyCsatDef: FlowNodeDefinition = { type: 'survey_csat', label: 'Survey CSAT' };

export function createDefaultRegistry() {
  const reg = new InMemoryFlowNodesRegistry();
  [
    startDef,
    endDef,
    playAudioDef,
    ttsDef,
    ivrCaptureDef,
    businessHoursDef,
    recordCallDef,
    asrSttDef,
    crmConditionDef,
    httpRequestDef,
    forwardDef,
    queueDef,
    voicemailDef,
    surveyCsatDef,
    // Novos tipos de nós FreeSWITCH
    answerDef,
    setDefaultsDef,
    collectDigitsDef,
    sanitizeDigitsDef,
    validateWithScriptDef,
    feedbackWhileValidatingDef,
    branchByStatusDef,
    routeResultDef,
    offerFallbackDef,
    transferDef,
    bridgeDef,
    callcenterDef,
    hangupDef
  ].forEach(d => reg.register(d));
  return reg;
}

