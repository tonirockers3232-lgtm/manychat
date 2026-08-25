"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { resolveBroadcastAudience } from "@/lib/data/broadcast-audience";
import type { BroadcastAudienceType } from "@/types/database";

export async function createBroadcastDraft(params: {
  organizationId: string;
  instagramAccountId: string;
  name: string;
  messageText: string;
  audienceType: BroadcastAudienceType;
  audienceRef: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("broadcasts")
    .insert({
      organization_id: params.organizationId,
      instagram_account_id: params.instagramAccountId,
      name: params.name,
      message_text: params.messageText,
      audience_type: params.audienceType,
      audience_ref: params.audienceRef,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    organizationId: params.organizationId,
    action: "created",
    entityType: "broadcast",
    entityId: data.id,
    entityName: data.name,
  });

  revalidatePath("/dashboard/broadcasts");
  return data;
}

// Reavalia o público na hora do envio (não usa nenhuma lista calculada na
// criação do rascunho) e enfileira um broadcast_recipients por contato — quem
// está dentro/fora da janela de 24h só é decidido depois, pelo cron
// (process-broadcasts), pra não travar a requisição do usuário mandando
// mensagens uma a uma aqui.
export async function sendBroadcastNow(broadcastId: string) {
  const supabase = await createClient();
  const { data: broadcast } = await supabase.from("broadcasts").select("*").eq("id", broadcastId).single();
  if (!broadcast) throw new Error("Broadcast não encontrado");
  if (broadcast.status !== "draft") throw new Error("Este broadcast já foi enviado");

  const audience = await resolveBroadcastAudience({
    organizationId: broadcast.organization_id,
    instagramAccountId: broadcast.instagram_account_id,
    audienceType: broadcast.audience_type,
    audienceRef: broadcast.audience_ref,
  });

  if (audience.length > 0) {
    const { error } = await supabase.from("broadcast_recipients").insert(
      audience.map((contact) => ({
        organization_id: broadcast.organization_id,
        broadcast_id: broadcast.id,
        contact_id: contact.id,
      }))
    );
    if (error) throw new Error(error.message);
  }

  await supabase.from("broadcasts").update({ status: "sending", sent_at: new Date().toISOString() }).eq("id", broadcast.id);

  await logAudit({
    organizationId: broadcast.organization_id,
    action: "status_changed",
    entityType: "broadcast",
    entityId: broadcast.id,
    entityName: broadcast.name,
    detail: { recipientCount: audience.length },
  });

  revalidatePath(`/dashboard/broadcasts/${broadcastId}`);
  revalidatePath("/dashboard/broadcasts");
}

export async function deleteBroadcastDraft(id: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("broadcasts").select("organization_id, name, status").eq("id", id).single();
  if (existing?.status && existing.status !== "draft") {
    throw new Error("Só é possível excluir broadcasts que ainda não foram enviados");
  }

  const { error } = await supabase.from("broadcasts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (existing) {
    await logAudit({
      organizationId: existing.organization_id,
      action: "deleted",
      entityType: "broadcast",
      entityId: null,
      entityName: existing.name,
    });
  }

  revalidatePath("/dashboard/broadcasts");
}
