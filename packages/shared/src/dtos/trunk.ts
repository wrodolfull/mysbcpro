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
  
  // FreeSWITCH Gateway specific fields
  register?: boolean; // default true - whether to register with the provider
  realm?: string; // auth realm, same as gateway name if blank
  fromUser?: string; // username to use in from field
  fromDomain?: string; // domain to use in from field
  extension?: string; // extension for inbound calls
  registerProxy?: string; // proxy to send register to
  registerTransport?: Transport; // transport for registration
  retrySeconds?: number; // retry interval on failure
  callerIdInFrom?: boolean; // use caller ID in from field
  contactParams?: string; // extra SIP params in contact
  ping?: number; // options ping interval
}

