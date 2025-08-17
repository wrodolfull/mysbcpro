-- First ensure the organizations table exists
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  domain text,
  webhook_base text,
  admin_email text,
  blocked boolean DEFAULT false,
  block_reason text,
  freeswitch_tenant_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraints for organization_id in all tables
-- Note: We need to handle existing data that might not have valid organization_id

-- 1. CSAT Tables
ALTER TABLE public.csat_surveys 
ADD CONSTRAINT fk_csat_surveys_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
ON DELETE CASCADE;

ALTER TABLE public.csat_questions 
ADD CONSTRAINT fk_csat_questions_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
ON DELETE CASCADE;

ALTER TABLE public.csat_responses 
ADD CONSTRAINT fk_csat_responses_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- 2. Observability Tables
ALTER TABLE public.events 
ADD CONSTRAINT fk_events_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
ON DELETE CASCADE;

ALTER TABLE public.executions 
ADD CONSTRAINT fk_executions_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- 3. Audio Files
ALTER TABLE public.audios 
ADD CONSTRAINT fk_audios_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- 4. Communication Objects
ALTER TABLE public.trunks 
ADD CONSTRAINT fk_trunks_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
ON DELETE CASCADE;

ALTER TABLE public.inbounds 
ADD CONSTRAINT fk_inbounds_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- 5. Flows
ALTER TABLE public.flows 
ADD CONSTRAINT fk_flows_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- Add foreign key for target_flow_id in inbounds (self-referencing to flows)
ALTER TABLE public.inbounds 
ADD CONSTRAINT fk_inbounds_target_flow 
FOREIGN KEY (target_flow_id) REFERENCES public.flows(id) 
ON DELETE SET NULL;

-- 6. Quotas table (already has organization_id as part of primary key, but add FK)
ALTER TABLE public.quotas 
ADD CONSTRAINT fk_quotas_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- Add indexes for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_csat_surveys_org_id ON public.csat_surveys (organization_id);
CREATE INDEX IF NOT EXISTS idx_csat_questions_org_id ON public.csat_questions (organization_id);
CREATE INDEX IF NOT EXISTS idx_csat_responses_org_id ON public.csat_responses (organization_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events (organization_id);
CREATE INDEX IF NOT EXISTS idx_executions_org_id ON public.executions (organization_id);
CREATE INDEX IF NOT EXISTS idx_audios_org_id ON public.audios (organization_id);
CREATE INDEX IF NOT EXISTS idx_trunks_org_id ON public.trunks (organization_id);
CREATE INDEX IF NOT EXISTS idx_inbounds_org_id ON public.inbounds (organization_id);
CREATE INDEX IF NOT EXISTS idx_flows_org_id ON public.flows (organization_id);
CREATE INDEX IF NOT EXISTS idx_inbounds_target_flow ON public.inbounds (target_flow_id);

-- Add unique constraints for organization-scoped names
ALTER TABLE public.trunks 
ADD CONSTRAINT uk_trunks_org_name UNIQUE (organization_id, name);

ALTER TABLE public.inbounds 
ADD CONSTRAINT uk_inbounds_org_name UNIQUE (organization_id, name);

ALTER TABLE public.inbounds 
ADD CONSTRAINT uk_inbounds_org_did UNIQUE (organization_id, did_or_uri);

ALTER TABLE public.flows 
ADD CONSTRAINT uk_flows_org_name UNIQUE (organization_id, name);

ALTER TABLE public.csat_surveys 
ADD CONSTRAINT uk_csat_surveys_org_name UNIQUE (organization_id, name);

ALTER TABLE public.audios 
ADD CONSTRAINT uk_audios_org_name UNIQUE (organization_id, name);

-- Add policies for organizations table
DROP POLICY IF EXISTS superadmin_access_organizations ON public.organizations;
DROP POLICY IF EXISTS org_access_organizations ON public.organizations;

-- Policy for superadmin access (can see all organizations)
CREATE POLICY superadmin_access_organizations ON public.organizations
  FOR ALL USING (
    coalesce((auth.jwt() ->> 'role'), '') = 'superadmin'
  );

-- Policy for organization access (can only see own organization)
CREATE POLICY org_access_organizations ON public.organizations
  FOR ALL USING (
    id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
  )
  WITH CHECK (
    id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
  );

-- Add policies for quotas table
ALTER TABLE public.quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_access_quotas ON public.quotas;
CREATE POLICY org_access_quotas ON public.quotas
  FOR ALL USING (
    organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
  )
  WITH CHECK (
    organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
  );

-- Add policies for CSAT tables
ALTER TABLE public.csat_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csat_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_access_csat_surveys ON public.csat_surveys;
CREATE POLICY org_access_csat_surveys ON public.csat_surveys
  FOR ALL USING (
    organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
  )
  WITH CHECK (
    organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
  );

DROP POLICY IF EXISTS org_access_csat_questions ON public.csat_questions;
CREATE POLICY org_access_csat_questions ON public.csat_questions
  FOR ALL USING (
    organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
  )
  WITH CHECK (
    organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
  );

DROP POLICY IF EXISTS org_access_csat_responses ON public.csat_responses;
CREATE POLICY org_access_csat_responses ON public.csat_responses
  FOR ALL USING (
    organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
  )
  WITH CHECK (
    organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
  );

-- Update existing tables to ensure NOT NULL constraints on organization_id
-- (This might fail if there's data without organization_id - handle manually)
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.csat_surveys ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set NOT NULL on csat_surveys.organization_id - check data integrity';
  END;
  
  BEGIN
    ALTER TABLE public.csat_questions ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set NOT NULL on csat_questions.organization_id - check data integrity';
  END;
  
  BEGIN
    ALTER TABLE public.csat_responses ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set NOT NULL on csat_responses.organization_id - check data integrity';
  END;
  
  BEGIN
    ALTER TABLE public.events ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set NOT NULL on events.organization_id - check data integrity';
  END;
  
  BEGIN
    ALTER TABLE public.executions ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set NOT NULL on executions.organization_id - check data integrity';
  END;
  
  BEGIN
    ALTER TABLE public.audios ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set NOT NULL on audios.organization_id - check data integrity';
  END;
  
  BEGIN
    ALTER TABLE public.trunks ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set NOT NULL on trunks.organization_id - check data integrity';
  END;
  
  BEGIN
    ALTER TABLE public.inbounds ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set NOT NULL on inbounds.organization_id - check data integrity';
  END;
  
  BEGIN
    ALTER TABLE public.flows ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not set NOT NULL on flows.organization_id - check data integrity';
  END;
END $$;

COMMENT ON TABLE public.organizations IS 'Organizations table for multi-tenancy with complete referential integrity';
