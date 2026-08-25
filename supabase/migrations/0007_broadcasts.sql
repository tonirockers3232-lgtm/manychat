-- Mensagem em massa: manda uma DM pro público de "todos os contatos", uma tag
-- ou um segmento. A API do Instagram só libera mandar DM pra quem escreveu
-- pra você nas últimas 24h (não existe tag de "marketing"/broadcast liberada
-- pro Instagram, diferente do Messenger — confirmado na doc oficial da Meta
-- antes de implementar, per Seção 32 do prompt original) — então cada
-- destinatário é avaliado contra essa janela na hora de *processar* o envio
-- (via cron, não sincronamente na criação), e quem está fora fica marcado
-- 'skipped_window' em vez de ter o envio tentado.
alter table contacts add column last_inbound_message_at timestamptz;

create table broadcasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  instagram_account_id uuid not null references instagram_accounts(id) on delete cascade,
  name text not null,
  message_text text not null,
  audience_type text not null check (audience_type in ('all', 'tag', 'segment')),
  audience_ref uuid, -- id da tag ou do segmento; null quando audience_type = 'all'
  status text not null default 'draft' check (status in ('draft', 'sending', 'completed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- organization_id denormalizado aqui (não só via join em broadcasts), mesmo
-- padrão já usado em automation_logs — simplifica a RLS e as queries de relatório.
create table broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  broadcast_id uuid not null references broadcasts(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'skipped_window', 'failed')),
  detail text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_broadcast_recipients_pending on broadcast_recipients(status, created_at) where status = 'pending';
create index idx_broadcast_recipients_broadcast on broadcast_recipients(broadcast_id);

alter table broadcasts enable row level security;
alter table broadcast_recipients enable row level security;

create policy "broadcasts_all" on broadcasts for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "broadcast_recipients_all" on broadcast_recipients for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

alter table audit_logs drop constraint audit_logs_entity_type_check;
alter table audit_logs add constraint audit_logs_entity_type_check check (entity_type in ('automation', 'custom_field', 'segment', 'broadcast'));
