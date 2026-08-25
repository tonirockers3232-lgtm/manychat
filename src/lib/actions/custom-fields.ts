"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
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
  const { data, error } = await supabase
    .from("custom_fields")
    .insert({
      organization_id: params.organizationId,
      key,
      label: params.label,
      field_type: params.fieldType,
      options: params.options ?? [],
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    organizationId: params.organizationId,
    action: "created",
    entityType: "custom_field",
    entityId: data.id,
    entityName: data.label,
  });

  revalidatePath("/dashboard/settings");
}

export async function deleteCustomField(id: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("custom_fields").select("organization_id, label").eq("id", id).single();

  const { error } = await supabase.from("custom_fields").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (existing) {
    await logAudit({
      organizationId: existing.organization_id,
      action: "deleted",
      entityType: "custom_field",
      entityId: null,
      entityName: existing.label,
    });
  }

  revalidatePath("/dashboard/settings");
}
