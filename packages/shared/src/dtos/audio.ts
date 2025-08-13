export interface AudioFileDTO {
  id?: string;
  organizationId: string;
  name: string;
  storagePath: string; // supabase storage path
  enginePath: string; // path on engine fs
  format: 'mp3' | 'wav';
  bytes?: number;
}

export interface TtsRequestDTO {
  organizationId: string;
  text: string;
  voiceId?: string;
}

export interface TtsQuotaDTO {
  organizationId: string;
  month: string; // YYYY-MM
  unitsUsed: number; // characters
  limit: number; // default 3000
}

