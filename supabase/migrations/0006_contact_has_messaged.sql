-- A condição "É seguidor" (ConditionNodeData.field = "is_follower") precisa saber
-- se já recebemos uma DM real desse contato: a Meta só libera consultar
-- is_user_follow_business para um Instagram-scoped ID que veio de um webhook de
-- MENSAGEM, não de um webhook de comentário. Sem essa flag, a condição não tem
-- como diferenciar "ainda não dá pra checar" de "não segue" e cairia de volta no
-- mesmo bug de sempre-verdadeiro que ela tinha antes.
alter table contacts add column has_messaged boolean not null default false;
