-- =========================================================================
-- Instagram Automation SaaS — schema inicial
-- Multi-tenant via organizations + organization_members, isolado por RLS.
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Organizations (tenants) & membership
-- ---------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'scale')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type org_role as enum ('owner', 'admin', 'member');

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index idx_organization_members_user on organization_members(user_id);
create index idx_organization_members_org on organization_members(organization_id);

-- Helper functions used by RLS policies across every tenant table.
create or replace function is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$;

create or replace function is_org_admin(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ---------------------------------------------------------------------
-- Instagram accounts connected via Meta OAuth
-- ---------------------------------------------------------------------

create table instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  instagram_business_id text not null, -- "user_id" retornado pela Instagram Login API
  page_id text, -- só existe no fluxo legado via Facebook Page; null no Instagram Login direto
  username text,
  name text,
  profile_pic_url text,
  access_token text not null,
  token_expires_at timestamptz,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error', 'token_expired')),
  connected_by uuid references auth.users(id),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, instagram_business_id)
);

create index idx_instagram_accounts_org on instagram_accounts(organization_id);

-- ---------------------------------------------------------------------
-- Contacts (Instagram users who interacted with a connected account)
-- ---------------------------------------------------------------------

create table contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  instagram_account_id uuid not null references instagram_accounts(id) on delete cascade,
  igsid text not null, -- Instagram-scoped ID
  username text,
  name text,
  profile_pic_url text,
  is_blocked boolean not null default false,
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (instagram_account_id, igsid)
);

create index idx_contacts_org on contacts(organization_id);
create index idx_contacts_account on contacts(instagram_account_id);

-- ---------------------------------------------------------------------
-- Tags & segments
-- ---------------------------------------------------------------------

create table tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table contact_tags (
  contact_id uuid not null references contacts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create table segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  filter_rules jsonb not null default '{}'::jsonb, -- { match: 'all'|'any', conditions: [...] }
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Conversations & messages (Inbox)
-- ---------------------------------------------------------------------

create table conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  instagram_account_id uuid not null references instagram_accounts(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed', 'snoozed')),
  automation_paused boolean not null default false,
  assigned_to uuid references auth.users(id),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (instagram_account_id, contact_id)
);

create index idx_conversations_org on conversations(organization_id);
create index idx_conversations_last_message on conversations(last_message_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_type text not null check (sender_type in ('contact', 'agent', 'automation', 'ai')),
  sender_user_id uuid references auth.users(id),
  message_type text not null default 'text' check (message_type in ('text', 'image', 'video', 'audio', 'file', 'comment_reply', 'quick_reply')),
  content text,
  media_url text,
  -- unique (não parcial: Postgres trata NULL como distinto entre si, então
  -- várias mensagens sem instagram_message_id convivem sem conflito) — usada
  -- pelo webhook para ignorar reentregas da Meta (upsert ... ignoreDuplicates)
  -- em vez de processar a mesma DM/comentário duas vezes.
  instagram_message_id text unique,
  status text not null default 'sent' check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on messages(conversation_id, created_at);
create index idx_messages_org on messages(organization_id);

-- ---------------------------------------------------------------------
-- Automations (visual flows), runs, logs and delayed actions
-- ---------------------------------------------------------------------

create table automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  instagram_account_id uuid references instagram_accounts(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  trigger_type text not null check (trigger_type in ('dm_keyword', 'comment_keyword', 'new_contact', 'story_reply', 'manual')),
  trigger_config jsonb not null default '{}'::jsonb, -- { keywords: [...], match_type: 'exact'|'contains' }
  flow_definition jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_automations_org on automations(organization_id);
create index idx_automations_account on automations(instagram_account_id);

create table automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  automation_id uuid not null references automations(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  status text not null default 'running' check (status in ('running', 'waiting', 'completed', 'failed', 'cancelled')),
  current_node_id text,
  context jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index idx_automation_runs_org on automation_runs(organization_id);
create index idx_automation_runs_automation on automation_runs(automation_id);
create index idx_automation_runs_status on automation_runs(status);

create table automation_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  automation_run_id uuid not null references automation_runs(id) on delete cascade,
  node_id text,
  node_type text,
  action text not null,
  status text not null check (status in ('success', 'error', 'skipped')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_automation_logs_run on automation_logs(automation_run_id, created_at);

-- Delayed / scheduled step execution (processed by a Vercel Cron endpoint).
create table pending_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  automation_run_id uuid not null references automation_runs(id) on delete cascade,
  next_node_id text not null,
  run_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index idx_pending_actions_due on pending_actions(run_at) where status = 'pending';

-- ---------------------------------------------------------------------
-- AI settings / prompts per organization
-- ---------------------------------------------------------------------

create table ai_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null default 'Padrão',
  system_prompt text not null default 'Você é um assistente de atendimento simpático e objetivo.',
  model text not null default 'gpt-4o-mini',
  temperature numeric(2,1) not null default 0.7,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_settings_org on ai_settings(organization_id);

-- ---------------------------------------------------------------------
-- Raw webhook events (auditoria / replays)
-- ---------------------------------------------------------------------

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  instagram_account_id uuid references instagram_accounts(id) on delete set null,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

create index idx_webhook_events_processed on webhook_events(processed, created_at);

-- ---------------------------------------------------------------------
-- Subscriptions (estrutura pronta para Stripe futuramente)
-- ---------------------------------------------------------------------

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade unique,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'scale')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table instagram_accounts enable row level security;
alter table contacts enable row level security;
alter table tags enable row level security;
alter table contact_tags enable row level security;
alter table segments enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table automations enable row level security;
alter table automation_runs enable row level security;
alter table automation_logs enable row level security;
alter table pending_actions enable row level security;
alter table ai_settings enable row level security;
alter table webhook_events enable row level security;
alter table subscriptions enable row level security;

-- organizations: visível para membros; criação livre (o dono vira membro logo após).
create policy "org_select_members" on organizations for select
  using (is_org_member(id));
create policy "org_insert_authenticated" on organizations for insert
  with check (auth.uid() is not null);
create policy "org_update_admins" on organizations for update
  using (is_org_admin(id));

-- organization_members: membros veem os colegas da mesma org; só admin/owner gerencia.
--
-- O insert é a policy mais sensível do schema: ela é o único portão que
-- separa "membro desta organização" de "qualquer usuário autenticado". Uma
-- versão anterior liberava `user_id = auth.uid()` sem checar organization_id,
-- o que permitia qualquer usuário se auto-inserir como membro (até "owner")
-- de QUALQUER organização e, a partir daí, ler/escrever tudo que as demais
-- policies liberam para "is_org_member" (contas do Instagram, conversas,
-- automações). Corrigido para só permitir auto-insert quando a organização
-- ainda não tem nenhum membro (bootstrap de uma org recém-criada pelo próprio
-- usuário) — o cadastro normal nunca passa por aqui, pois `handle_new_user()`
-- roda como SECURITY DEFINER e ignora RLS.
create policy "members_select_same_org" on organization_members for select
  using (is_org_member(organization_id));
create policy "members_insert_admin_or_bootstrap" on organization_members for insert
  with check (
    is_org_admin(organization_id)
    or (
      user_id = auth.uid()
      and not exists (
        select 1 from organization_members m
        where m.organization_id = organization_members.organization_id
      )
    )
  );
create policy "members_update_admins" on organization_members for update
  using (is_org_admin(organization_id));
create policy "members_delete_admins" on organization_members for delete
  using (is_org_admin(organization_id));

-- Padrão para todas as tabelas "tenant-scoped": select/insert/update/delete
-- restritos a quem pertence à organization_id da linha.
create policy "instagram_accounts_all" on instagram_accounts for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "contacts_all" on contacts for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "tags_all" on tags for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "contact_tags_all" on contact_tags for all
  using (exists (select 1 from contacts c where c.id = contact_id and is_org_member(c.organization_id)))
  with check (exists (select 1 from contacts c where c.id = contact_id and is_org_member(c.organization_id)));

create policy "segments_all" on segments for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "conversations_all" on conversations for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "messages_all" on messages for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "automations_all" on automations for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "automation_runs_all" on automation_runs for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "automation_logs_all" on automation_logs for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "pending_actions_all" on pending_actions for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "ai_settings_all" on ai_settings for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "webhook_events_select" on webhook_events for select
  using (organization_id is null or is_org_member(organization_id));

create policy "subscriptions_all" on subscriptions for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

-- =========================================================================
-- Triggers utilitários
-- =========================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at before update on organizations
  for each row execute function set_updated_at();
create trigger trg_instagram_accounts_updated_at before update on instagram_accounts
  for each row execute function set_updated_at();
create trigger trg_automations_updated_at before update on automations
  for each row execute function set_updated_at();
create trigger trg_ai_settings_updated_at before update on ai_settings
  for each row execute function set_updated_at();
create trigger trg_subscriptions_updated_at before update on subscriptions
  for each row execute function set_updated_at();

-- Cria a organization + membership + assinatura free automaticamente
-- para todo novo usuário que se cadastra (signup = onboarding completo).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'company_name', split_part(new.email, '@', 1));

  insert into organizations (name, slug)
  values (org_name, 'org-' || substr(new.id::text, 1, 8))
  returning id into new_org_id;

  insert into organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  insert into subscriptions (organization_id, plan, status)
  values (new_org_id, 'free', 'active');

  insert into ai_settings (organization_id)
  values (new_org_id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
