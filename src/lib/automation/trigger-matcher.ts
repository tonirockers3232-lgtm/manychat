import { createAdminClient } from "@/lib/supabase/admin";
import type { Automation, AutomationTriggerType } from "@/types/database";

// Remove acentos antes de comparar: em português "violão" e "violao" são o
// mesmo gatilho na cabeça de quem escreve a keyword, mas contatos reais
// digitam com acento com muito mais frequência do que quem configura a
// automação (que tende a digitar sem acento, no teclado/hábito de dev).
// Sem isso, uma keyword salva sem acento nunca casava com o texto real.
const DIACRITICS_RE = new RegExp("[̀-ͯ]", "g");

export function normalize(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(DIACRITICS_RE, "");
}

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

  const normalizedText = normalize(params.text);

  for (const automation of automations) {
    const keywords = automation.trigger_config?.keywords ?? [];
    if (keywords.length === 0) continue; // gatilho sem keyword = não dispara automaticamente

    const matchType = automation.trigger_config?.match_type ?? "contains";
    const matched = keywords.some((keyword: string) => {
      const normalizedKeyword = normalize(keyword);
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
