"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// RLS garante que só um membro da organização dona da conta consegue
// desconectá-la — não há checagem manual de organization_id aqui.
export async function disconnectInstagramAccount(accountId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("instagram_accounts")
    .update({ status: "disconnected" })
    .eq("id", accountId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/instagram");
}

// Exclusão definitiva (não é o mesmo que desconectar): a FK em cascade
// derruba junto contatos, conversas, mensagens e automações vinculadas
// a esta conta. Botão no client já confirma com o usuário antes de chamar.
export async function deleteInstagramAccount(accountId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("instagram_accounts")
    .select("organization_id, username")
    .eq("id", accountId)
    .single();

  const { error } = await supabase.from("instagram_accounts").delete().eq("id", accountId);
  if (error) throw new Error(error.message);

  if (existing) {
    await logAudit({
      organizationId: existing.organization_id,
      action: "deleted",
      entityType: "instagram_account",
      entityId: null,
      entityName: existing.username ? `@${existing.username}` : null,
    });
  }

  revalidatePath("/dashboard/instagram");
}
