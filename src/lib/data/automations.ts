import { createClient } from "@/lib/supabase/server";
import type { Automation } from "@/types/database";

export async function listAutomations(organizationId: string): Promise<Automation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("automations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAutomation(id: string): Promise<Automation | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("automations").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function listInstagramAccountOptions(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("instagram_accounts")
    .select("id, username")
    .eq("organization_id", organizationId)
    .eq("status", "connected");
  return data ?? [];
}
