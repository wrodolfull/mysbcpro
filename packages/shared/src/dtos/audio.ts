export interface AudioFileDTO {
  id?: string;
  organizationId: string;
  name: string;
  type: 'uploaded' | 'tts';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string; // supabase storage path
  enginePath: string; // path on engine fs
  ttsText?: string; // original TTS text
  ttsVoice?: string; // TTS voice used
  ttsCharsUsed?: number; // characters used for TTS
  createdAt?: string;
}

export interface TtsRequestDTO {
  text: string;
  voice?: string;
}

export interface TtsQuotaDTO {
  organizationId: string;
  month: string; // YYYY-MM
  unitsUsed: number; // characters
  limit: number; // default 3000
}

