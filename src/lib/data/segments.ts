import { createClient } from "@/lib/supabase/server";
import type { Contact, Segment, SegmentFilterRules } from "@/types/database";

export async function listSegments(organizationId: string): Promise<Segment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("segments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

// Contato com os relacionamentos necessários para avaliar filter_rules e
// para exibir na página de Contatos — uma única query serve os dois usos.
export interface ContactWithRelations extends Contact {
  tagNames: string[];
  customFieldValues: Record<string, string | null>; // key do campo -> valor
}

export async function listContactsWithRelations(organizationId: string): Promise<ContactWithRelations[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*, contact_tags(tags(name)), custom_field_values(value, custom_fields(key))")
    .eq("organization_id", organizationId)
    .order("last_interaction_at", { ascending: false })
    .limit(200);

  return (data ?? []).map((row) => {
    const tagNames = ((row.contact_tags ?? []) as unknown as Array<{ tags: { name: string } | null }>)
      .map((t) => t.tags?.name)
      .filter((n): n is string => Boolean(n));

    const customFieldValues: Record<string, string | null> = {};
    for (const v of (row.custom_field_values ?? []) as unknown as Array<{
      value: string | null;
      custom_fields: { key: string } | null;
    }>) {
      if (v.custom_fields?.key) customFieldValues[v.custom_fields.key] = v.value;
    }

    const { contact_tags: _tags, custom_field_values: _values, ...contact } = row as unknown as Contact & {
      contact_tags: unknown;
      custom_field_values: unknown;
    };

    return { ...contact, tagNames, customFieldValues };
  });
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
