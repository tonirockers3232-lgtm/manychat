import type { Contact, SegmentFilterRules } from "@/types/database";

// Contato com os relacionamentos necessários para avaliar filter_rules e para
// exibir na página de Contatos. Vive num módulo sem diretiva e sem import do
// cliente Supabase de servidor: `matchesSegment` é usado tanto em Server
// Components (segments/page.tsx) quanto em Client Components (contacts-list.tsx)
// — um import de valor vindo de `lib/data/segments.ts` (que importa
// `lib/supabase/server`) quebra o build do lado cliente, mesmo só usando uma
// função pura de lá (mesma classe de bug do STATUS_LABEL desta sessão).
export interface ContactWithRelations extends Contact {
  tagNames: string[];
  customFieldValues: Record<string, string | null>; // key do campo -> valor
}

// Avalia se um contato bate com as regras de um segmento. Roda em memória
// (não em SQL) porque as condições cruzam tabelas diferentes (tags, campos
// personalizados, colunas nativas) — na escala de um único workspace isso é
// mais simples e correto do que montar uma query dinâmica com joins condicionais.
export function matchesSegment(contact: ContactWithRelations, rules: SegmentFilterRules): boolean {
  if (rules.conditions.length === 0) return true;

  const results = rules.conditions.map((condition) => {
    const value = condition.value ?? "";
    switch (condition.field) {
      case "tag":
        return condition.operator === "not_has_tag"
          ? !contact.tagNames.includes(value)
          : contact.tagNames.includes(value);
      case "username":
        return condition.operator === "equals"
          ? contact.username === value
          : (contact.username ?? "").toLowerCase().includes(value.toLowerCase());
      case "status":
        return contact.status === value;
      case "custom_field": {
        const fieldValue = (condition.customFieldKey ? contact.customFieldValues[condition.customFieldKey] : null) ?? "";
        return condition.operator === "equals"
          ? fieldValue === value
          : fieldValue.toLowerCase().includes(value.toLowerCase());
      }
      case "last_interaction_at": {
        const target = new Date(value).getTime();
        const actual = new Date(contact.last_interaction_at).getTime();
        return condition.operator === "after" ? actual > target : actual < target;
      }
      default:
        return false;
    }
  });

  return rules.match === "all" ? results.every(Boolean) : results.some(Boolean);
}
