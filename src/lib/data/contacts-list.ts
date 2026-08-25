import { createClient } from "@/lib/supabase/server";

export async function listTags(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("*").eq("organization_id", organizationId).order("name");
  return data ?? [];
}

// Lista leve pro seletor de contato do botão "Testar automação" — só os
// campos usados pra exibir/escolher, não o ContactWithRelations completo
// (tags/custom fields) que a página de Contatos precisa.
export async function listContactsForAccount(instagramAccountId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, username, name, igsid")
    .eq("instagram_account_id", instagramAccountId)
    .order("last_interaction_at", { ascending: false })
    .limit(200);
  return data ?? [];
}
