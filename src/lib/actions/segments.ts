"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { SegmentFilterRules } from "@/types/database";

export async function createSegment(params: { organizationId: string; name: string; filterRules: SegmentFilterRules }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("segments")
    .insert({
      organization_id: params.organizationId,
      name: params.name,
      filter_rules: params.filterRules,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    organizationId: params.organizationId,
    action: "created",
    entityType: "segment",
    entityId: data.id,
    entityName: data.name,
  });

  revalidatePath("/dashboard/segments");
}

export async function deleteSegment(id: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("segments").select("organization_id, name").eq("id", id).single();

  const { error } = await supabase.from("segments").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (existing) {
    await logAudit({
      organizationId: existing.organization_id,
      action: "deleted",
      entityType: "segment",
      entityId: null,
      entityName: existing.name,
    });
  }

  revalidatePath("/dashboard/segments");
}
