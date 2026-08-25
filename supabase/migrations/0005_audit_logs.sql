-- Trilha de auditoria de ações administrativas do usuário (criar/editar/excluir
-- automação, campo personalizado, segmento) — distinta de `automation_logs`
-- (execução do motor) e `webhook_events` (payloads brutos da Meta). Sem essa
-- tabela não há como responder "quem mudou isso e quando" depois do fato —
-- o incidente desta sessão em que uma automação de produção sumiu sem log
-- algum é exatamente o caso que essa tabela existe para prevenir.
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created', 'updated', 'status_changed', 'deleted')),
  entity_type text not null check (entity_type in ('automation', 'custom_field', 'segment')),
  entity_id uuid, -- null quando o registro já foi excluído (mantém o histórico mesmo assim)
  entity_name text, -- snapshot do nome/label no momento da ação — sobrevive à exclusão da entidade
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_org_created on audit_logs(organization_id, created_at desc);

alter table audit_logs enable row level security;

-- Só leitura + insert para membros da org — sem policy de update/delete
-- (default deny), de propósito: trilha de auditoria é append-only.
create policy "audit_logs_select" on audit_logs for select
  using (is_org_member(organization_id));

create policy "audit_logs_insert" on audit_logs for insert
  with check (is_org_member(organization_id));
