import { createClient } from "@/lib/supabase/server";

export async function listContacts(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*, contact_tags(tags(id, name, color))")
    .eq("organization_id", organizationId)
    .order("last_interaction_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function listTags(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("*").eq("organization_id", organizationId).order("name");
  return data ?? [];
}
