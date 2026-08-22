"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { sendDirectMessage } from "@/lib/meta/instagram-api";

// Envio manual pelo agente humano na caixa de entrada. Usa o client
// autenticado (RLS) para garantir que só um membro da organização dona da
// conversa consegue enviar mensagens por ela.
export async function sendManualMessage(conversationId: string, text: string) {
  if (!text.trim()) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, contacts(igsid), instagram_accounts(instagram_business_id, access_token)")
    .eq("id", conversationId)
    .single();

  if (!conversation) throw new Error("Conversa não encontrada");

  const account = conversation.instagram_accounts as unknown as {
    instagram_business_id: string;
    access_token: string;
  };
  const contact = conversation.contacts as unknown as { igsid: string };

  await sendDirectMessage({
    accessToken: decryptToken(account.access_token),
    igBusinessId: account.instagram_business_id,
    recipientIgsid: contact.igsid,
    text,
  });

  await supabase.from("messages").insert({
    organization_id: conversation.organization_id,
    conversation_id: conversationId,
    direction: "outbound",
    sender_type: "agent",
    sender_user_id: user.id,
    message_type: "text",
    content: text,
    status: "sent",
  });
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  revalidatePath(`/dashboard/inbox/${conversationId}`);
}

export async function toggleAutomationPause(conversationId: string, paused: boolean) {
  const supabase = await createClient();
  await supabase.from("conversations").update({ automation_paused: paused }).eq("id", conversationId);
  revalidatePath(`/dashboard/inbox/${conversationId}`);
}
