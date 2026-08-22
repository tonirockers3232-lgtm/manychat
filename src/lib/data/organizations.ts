import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/types/database";

// Organização "ativa" do usuário logado — hoje é sempre a primeira (o
// onboarding cria uma automaticamente no signup). Quando o multi-empresa por
// usuário for exposto na UI, trocar por um seletor persistido em cookie.
export async function getCurrentOrganization(): Promise<Organization | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data?.organizations as unknown as Organization) ?? null;
}

export async function listUserOrganizations(): Promise<Organization[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("organization_members")
    .select("organizations(*)")
    .eq("user_id", user.id);

  return (data ?? []).map((row) => row.organizations as unknown as Organization);
}
