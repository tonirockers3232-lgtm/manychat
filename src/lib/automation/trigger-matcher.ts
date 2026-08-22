import { createAdminClient } from "@/lib/supabase/admin";
import type { Automation, AutomationTriggerType } from "@/types/database";

// Retorna as automações ativas da conta cujo gatilho por palavra-chave bate
// com o texto recebido (DM ou comentário). Primeira automação cadastrada que
// casar "ganha" — evita disparar vários fluxos concorrentes pro mesmo evento.
export async function findMatchingAutomation(params: {
  instagramAccountId: string;
  triggerType: AutomationTriggerType;
  text: string;
}): Promise<Automation | null> {
  const supabase = createAdminClient();

  const { data: automations } = await supabase
    .from("automations")
    .select("*")
    .eq("instagram_account_id", params.instagramAccountId)
    .eq("status", "active")
    .eq("trigger_type", params.triggerType)
    .order("created_at", { ascending: true });

  if (!automations?.length) return null;

  const normalizedText = params.text.trim().toLowerCase();

  for (const automation of automations) {
    const keywords = automation.trigger_config?.keywords ?? [];
    if (keywords.length === 0) continue; // gatilho sem keyword = não dispara automaticamente

    const matchType = automation.trigger_config?.match_type ?? "contains";
    const matched = keywords.some((keyword: string) => {
      const normalizedKeyword = keyword.trim().toLowerCase();
      return matchType === "exact"
        ? normalizedText === normalizedKeyword
        : normalizedText.includes(normalizedKeyword);
    });

    if (matched) return automation;
  }

  return null;
}

export async function findNewContactAutomation(instagramAccountId: string): Promise<Automation | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("automations")
    .select("*")
    .eq("instagram_account_id", instagramAccountId)
    .eq("status", "active")
    .eq("trigger_type", "new_contact")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
