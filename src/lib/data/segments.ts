import { createClient } from "@/lib/supabase/server";
import type { Contact, Segment } from "@/types/database";
import { matchesSegment, type ContactWithRelations } from "@/lib/segment-match";

export { matchesSegment, type ContactWithRelations };

export async function listSegments(organizationId: string): Promise<Segment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("segments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  return data ?? [];
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
