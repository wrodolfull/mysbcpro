-- Create organizations table
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  webhook_base text,
  admin_email text,
  blocked boolean default false,
  block_reason text,
  freeswitch_tenant_id text unique, -- ID do tenant no FreeSWITCH
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.organizations enable row level security;

-- Policy for superadmin access (can see all organizations)
do $$ begin
  create policy if not exists superadmin_access_organizations on public.organizations
    for all using (
      coalesce((auth.jwt() ->> 'role'), '') = 'superadmin'
    );
exception when others then null; end $$;

-- Policy for organization access (can only see own organization)
do $$ begin
  create policy if not exists org_access_organizations on public.organizations
    for all using (
      id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
    )
    with check (
      id::text = coalesce((auth.jwt() ->> 'organization_id'), '')
    );
exception when others then null; end $$;

-- Add unique constraint on name
alter table public.organizations 
add constraint if not exists organizations_name_unique unique (name);

-- Create index for performance
create index if not exists organizations_name_idx on public.organizations (name);
create index if not exists organizations_freeswitch_tenant_idx on public.organizations (freeswitch_tenant_id);

-- Add organization reference to auth.users metadata
comment on table public.organizations is 'Organizations table for multi-tenancy';
