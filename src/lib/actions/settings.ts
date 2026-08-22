"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateOrganizationName(organizationId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ name }).eq("id", organizationId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function updateAiSettings(params: {
  id: string;
  systemPrompt: string;
  model: string;
  temperature: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_settings")
    .update({ system_prompt: params.systemPrompt, model: params.model, temperature: params.temperature })
    .eq("id", params.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

// Registra a solicitação de exclusão de dados. O processamento efetivo
// (remoção definitiva) deve ser feito manualmente ou por um job assíncrono —
// aqui só marcamos a organização e revogamos o acesso imediatamente.
export async function requestAccountDeletion(organizationId: string) {
  const supabase = await createClient();
  await supabase.from("instagram_accounts").update({ status: "disconnected" }).eq("organization_id", organizationId);
  await supabase
    .from("organizations")
    .update({ name: "[Exclusão solicitada] — processar manualmente" })
    .eq("id", organizationId);
}
