-- Marca runs disparados manualmente pelo botão "Testar automação" (não por
-- um gatilho real do Instagram), pra poder excluí-los do ranking de
-- automações em Analytics sem perder o histórico em Logs.
alter table automation_runs add column is_test boolean not null default false;
