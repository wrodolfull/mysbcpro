export interface QuotasDTO {
  organizationId: string;
  month: string; // YYYY-MM
  limits: {
    tts_units: number;
    flow_exec: number;
  };
  usage: {
    tts_units_used: number;
    flow_exec_used: number;
  };
}

export interface AlertThreshold {
  thresholdPct: number; // e.g., 80 or 100
  notifiedAt?: string;
}

