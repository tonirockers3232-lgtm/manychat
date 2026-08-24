"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CustomFieldType } from "@/types/database";

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function createCustomField(params: {
  organizationId: string;
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
}) {
  const key = slugify(params.label);
  if (!key) throw new Error("Nome do campo inválido");

  const supabase = await createClient();
  const { error } = await supabase.from("custom_fields").insert({
    organization_id: params.organizationId,
    key,
    label: params.label,
    field_type: params.fieldType,
    options: params.options ?? [],
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function deleteCustomField(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("custom_fields").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}
