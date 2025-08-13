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
    surveyCsatDef
  ].forEach(d => reg.register(d));
  return reg;
}

