import { createClient } from "@/lib/supabase/server";
import type { AuditLog } from "@/types/database";

export async function listAuditLogs(organizationId: string): Promise<AuditLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}
