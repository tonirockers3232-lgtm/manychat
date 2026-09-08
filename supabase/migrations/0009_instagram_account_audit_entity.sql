alter table audit_logs drop constraint audit_logs_entity_type_check;
alter table audit_logs add constraint audit_logs_entity_type_check check (entity_type in ('automation', 'custom_field', 'segment', 'broadcast', 'instagram_account'));
