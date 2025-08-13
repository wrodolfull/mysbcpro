-- organizations additions
alter table if exists public.organizations
  add column if not exists domain text,
  add column if not exists webhook_base text,
  add column if not exists admin_email text,
  add column if not exists blocked boolean default false,
  add column if not exists block_reason text;

-- quotas table
create table if not exists public.quotas (
  organization_id uuid not null,
  month text not null,
  limits jsonb not null default '{"tts_units":3000,"flow_exec":100000}',
  usage jsonb not null default '{"tts_units_used":0,"flow_exec_used":0}',
  primary key (organization_id, month)
);

-- csat
create table if not exists public.csat_surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  score_types text[] not null,
  public_link_slug text not null,
  enabled boolean default true
);

create table if not exists public.csat_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  survey_id uuid not null references public.csat_surveys(id) on delete cascade,
  text text not null,
  "order" int not null
);

create table if not exists public.csat_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  survey_id uuid not null references public.csat_surveys(id) on delete cascade,
  question_id uuid not null references public.csat_questions(id) on delete cascade,
  trace_id text not null,
  channel text not null,
  score_type text not null,
  score int not null,
  comment text,
  created_at timestamptz default now()
);

-- events / executions for observability
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  trace_id text not null,
  type text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  trace_id text not null,
  flow_id uuid,
  node_id text,
  status text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- communications objects
create table if not exists public.trunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  host text not null,
  enabled boolean not null default true,
  username text,
  secret text,
  transport text,
  srtp text,
  proxy text,
  registrar text,
  expires int default 300,
  codecs text[],
  dtmf_mode text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.inbounds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  did_or_uri text not null,
  caller_id_number text,
  network_addr text,
  context text not null,
  priority int not null default 100,
  match_rules jsonb,
  target_flow_id uuid,
  enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.flows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  status text not null,
  version int not null default 1,
  graph jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS enable
alter table public.trunks enable row level security;
alter table public.inbounds enable row level security;
alter table public.flows enable row level security;
alter table public.events enable row level security;
alter table public.executions enable row level security;

-- Policies (assumes JWT contains organization_id claim)
do $$ begin
  create policy if not exists org_access_trunks on public.trunks
    for all using (organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), ''))
    with check (organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), ''));
exception when others then null; end $$;

do $$ begin
  create policy if not exists org_access_inbounds on public.inbounds
    for all using (organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), ''))
    with check (organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), ''));
exception when others then null; end $$;

do $$ begin
  create policy if not exists org_access_flows on public.flows
    for all using (organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), ''))
    with check (organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), ''));
exception when others then null; end $$;

do $$ begin
  create policy if not exists org_access_events on public.events
    for all using (organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), ''))
    with check (organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), ''));
exception when others then null; end $$;

do $$ begin
  create policy if not exists org_access_exec on public.executions
    for all using (organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), ''))
    with check (organization_id::text = coalesce((auth.jwt() ->> 'organization_id'), ''));
exception when others then null; end $$;

