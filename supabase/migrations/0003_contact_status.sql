-- =========================================================================
-- Status de qualificação do contato (CRM leve) — usado pela página de
-- Contatos e como campo filtrável em Segmentos.
-- =========================================================================

alter table contacts
  add column status text not null default 'novo'
  check (status in ('novo', 'interessado', 'qualificado', 'lead_quente', 'em_atendimento', 'cliente', 'perdido'));

create index idx_contacts_status on contacts(organization_id, status);
