import { createAdminClient } from "@/lib/supabase/admin";
import type { Contact, Conversation } from "@/types/database";

// Busca o contato pelo igsid; cria se for a primeira interação dessa pessoa
// com a conta conectada. Retorna também se foi recém-criado (usado para
// disparar o gatilho "new_contact").
export async function getOrCreateContact(params: {
  organizationId: string;
  instagramAccountId: string;
  igsid: string;
  username?: string;
  name?: string;
  // true só no caminho de DM (handleIncomingMessage) — marca que este igsid já
  // veio de um webhook de mensagem de verdade, não só de comentário. Necessário
  // pra condição "É seguidor" (is_user_follow_business só é consultável nesse caso).
  markMessaged?: boolean;
}): Promise<{ contact: Contact; isNew: boolean }> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("contacts")
    .select("*")
    .eq("instagram_account_id", params.instagramAccountId)
    .eq("igsid", params.igsid)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("contacts")
      .update({
        last_interaction_at: new Date().toISOString(),
        ...(params.markMessaged ? { has_messaged: true, last_inbound_message_at: new Date().toISOString() } : {}),
      })
      .eq("id", existing.id);
    return { contact: existing, isNew: false };
  }

  const { data: created, error } = await supabase
    .from("contacts")
    .insert({
      organization_id: params.organizationId,
      instagram_account_id: params.instagramAccountId,
      igsid: params.igsid,
      username: params.username ?? null,
      name: params.name ?? null,
      has_messaged: params.markMessaged ?? false,
      last_inbound_message_at: params.markMessaged ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error || !created) throw new Error(`Falha ao criar contato: ${error?.message}`);
  return { contact: created, isNew: true };
}

export async function getOrCreateConversation(params: {
  organizationId: string;
  instagramAccountId: string;
  contactId: string;
}): Promise<Conversation> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("instagram_account_id", params.instagramAccountId)
    .eq("contact_id", params.contactId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      organization_id: params.organizationId,
      instagram_account_id: params.instagramAccountId,
      contact_id: params.contactId,
    })
    .select()
    .single();

  if (error || !created) throw new Error(`Falha ao criar conversa: ${error?.message}`);
  return created;
}
