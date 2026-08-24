import { createAdminClient } from "@/lib/supabase/admin";
import type { Contact } from "@/types/database";

// Placeholder sem valor vira string vazia — nunca deixamos {{campo}} literal
// vazar pra uma mensagem real enviada ao contato.
export function renderTemplate(text: string, values: Record<string, string | null | undefined>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? "");
}

// Busca contato + valores de custom fields e monta o dicionário de variáveis
// disponíveis em qualquer texto de automação ({{first_name}}, {{phone}}, {{<key>}}...).
export async function buildContactVariables(contactId: string): Promise<Record<string, string | null>> {
  const supabase = createAdminClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("name, username, phone, email")
    .eq("id", contactId)
    .single();

  const { data: values } = await supabase
    .from("custom_field_values")
    .select("value, custom_fields!inner(key)")
    .eq("contact_id", contactId);

  const c = contact as Pick<Contact, "name" | "username" | "phone" | "email"> | null;

  const vars: Record<string, string | null> = {
    first_name: c?.name?.split(" ")[0] ?? null,
    name: c?.name ?? null,
    username: c?.username ?? null,
    phone: c?.phone ?? null,
    email: c?.email ?? null,
  };

  for (const row of values ?? []) {
    const key = (row as unknown as { custom_fields: { key: string } }).custom_fields.key;
    vars[key] = (row as { value: string | null }).value;
  }

  return vars;
}
