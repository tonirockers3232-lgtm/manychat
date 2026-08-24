"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SegmentFilterRules } from "@/types/database";

export async function createSegment(params: { organizationId: string; name: string; filterRules: SegmentFilterRules }) {
  const supabase = await createClient();
  const { error } = await supabase.from("segments").insert({
    organization_id: params.organizationId,
    name: params.name,
    filter_rules: params.filterRules,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/segments");
}

export async function deleteSegment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("segments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/segments");
}
