import { createClient } from "@/lib/supabase/server";
import type { CustomField } from "@/types/database";

export async function listCustomFields(organizationId: string): Promise<CustomField[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  return data ?? [];
}
