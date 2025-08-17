-- Migration: Add FreeSWITCH gateway fields to trunks table
-- Date: 2024-12-19

-- Add new fields for FreeSWITCH gateway configuration
ALTER TABLE public.trunks 
ADD COLUMN IF NOT EXISTS register boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS realm text,
ADD COLUMN IF NOT EXISTS from_user text,
ADD COLUMN IF NOT EXISTS from_domain text,
ADD COLUMN IF NOT EXISTS extension text,
ADD COLUMN IF NOT EXISTS register_proxy text,
ADD COLUMN IF NOT EXISTS register_transport text,
ADD COLUMN IF NOT EXISTS retry_seconds integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS caller_id_in_from boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contact_params text,
ADD COLUMN IF NOT EXISTS ping integer DEFAULT 25;

-- Add comments for documentation
COMMENT ON COLUMN public.trunks.register IS 'Whether to register with the SIP provider (default: true)';
COMMENT ON COLUMN public.trunks.realm IS 'Auth realm, same as gateway name if blank';
COMMENT ON COLUMN public.trunks.from_user IS 'Username to use in from field';
COMMENT ON COLUMN public.trunks.from_domain IS 'Domain to use in from field';
COMMENT ON COLUMN public.trunks.extension IS 'Extension for inbound calls';
COMMENT ON COLUMN public.trunks.register_proxy IS 'Proxy to send register to';
COMMENT ON COLUMN public.trunks.register_transport IS 'Transport for registration';
COMMENT ON COLUMN public.trunks.retry_seconds IS 'Retry interval on failure (default: 30)';
COMMENT ON COLUMN public.trunks.caller_id_in_from IS 'Use caller ID in from field (default: false)';
COMMENT ON COLUMN public.trunks.contact_params IS 'Extra SIP params in contact';
COMMENT ON COLUMN public.trunks.ping IS 'Options ping interval in seconds (default: 25)';
