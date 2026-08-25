-- =========================================================================
-- Adiciona "story_mention" aos tipos de gatilho possíveis. "story_reply" já
-- existia desde a 0001 (nunca tinha sido ligado a nada no código).
-- =========================================================================

alter table automations drop constraint automations_trigger_type_check;

alter table automations add constraint automations_trigger_type_check
  check (trigger_type in ('dm_keyword', 'comment_keyword', 'new_contact', 'story_reply', 'story_mention', 'manual'));
