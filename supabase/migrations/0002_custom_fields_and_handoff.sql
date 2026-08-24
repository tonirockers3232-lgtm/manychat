-- =========================================================================
-- Campos personalizados de contato + colunas nativas telefone/e-mail.
-- Suporta o motor de qualificação (nó "Pergunta" + condição por campo).
-- =========================================================================

alter table contacts add column phone text;
alter table contacts add column email text;

create table custom_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null, -- usado em {{key}} nas mensagens e como saveTo do nó "Pergunta"
  label text not null,
  field_type text not null default 'text' check (field_type in ('text', 'number', 'email', 'phone', 'select', 'boolean')),
  options jsonb not null default '[]'::jsonb, -- lista de strings, só relevante para field_type = 'select'
  created_at timestamptz not null default now(),
  unique (organization_id, key)
);

create index idx_custom_fields_org on custom_fields(organization_id);

create table custom_field_values (
  contact_id uuid not null references contacts(id) on delete cascade,
  custom_field_id uuid not null references custom_fields(id) on delete cascade,
  value text,
  updated_at timestamptz not null default now(),
  primary key (contact_id, custom_field_id)
);

alter table custom_fields enable row level security;
alter table custom_field_values enable row level security;

create policy "custom_fields_all" on custom_fields for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

-- Mesmo padrão de contact_tags_all: RLS via join em contacts, já que a tabela
-- de valores não tem organization_id própria.
create policy "custom_field_values_all" on custom_field_values for all
  using (exists (select 1 from contacts c where c.id = contact_id and is_org_member(c.organization_id)))
  with check (exists (select 1 from contacts c where c.id = contact_id and is_org_member(c.organization_id)));
