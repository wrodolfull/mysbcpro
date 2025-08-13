export type Transport = 'udp' | 'tcp' | 'tls';
export type SrtpMode = 'optional' | 'required' | 'off';
export type DtmfMode = 'rfc2833' | 'inband' | 'info';

export interface TrunkDTO {
  id?: string;
  organizationId: string;
  name: string;
  host: string;
  enabled: boolean;

  username?: string;
  secret?: string;
  transport?: Transport;
  srtp?: SrtpMode;
  proxy?: string;
  registrar?: string;
  expires?: number; // default 300
  codecs?: string[]; // default ["PCMU","PCMA"]
  dtmfMode?: DtmfMode;
}

