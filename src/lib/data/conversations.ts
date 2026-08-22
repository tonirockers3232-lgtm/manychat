import { createClient } from "@/lib/supabase/server";

export async function listConversations(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*, contacts(*), instagram_accounts(username)")
    .eq("organization_id", organizationId)
    .order("last_message_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

export async function getConversationWithMessages(conversationId: string) {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, contacts(*), instagram_accounts(*)")
    .eq("id", conversationId)
    .single();

  if (!conversation) return null;

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return { conversation, messages: messages ?? [] };
}
