import { createClient } from "@/lib/supabase/server";

export async function listTags(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("*").eq("organization_id", organizationId).order("name");
  return data ?? [];
}
