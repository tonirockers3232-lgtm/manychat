import { createClient } from "@/lib/supabase/server";
import type { Broadcast, BroadcastRecipient, BroadcastRecipientStatus } from "@/types/database";

export interface BroadcastWithCounts extends Broadcast {
  counts: Record<BroadcastRecipientStatus, number>;
}

export interface BroadcastRecipientWithContact extends BroadcastRecipient {
  contacts: { username: string | null; name: string | null } | null;
}

export async function listBroadcasts(organizationId: string): Promise<BroadcastWithCounts[]> {
  const supabase = await createClient();
  const { data: broadcasts } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (!broadcasts?.length) return [];

  const { data: recipients } = await supabase
    .from("broadcast_recipients")
    .select("broadcast_id, status")
    .in(
      "broadcast_id",
      broadcasts.map((b) => b.id)
    );

  return broadcasts.map((broadcast) => {
    const counts: Record<BroadcastRecipientStatus, number> = {
      pending: 0,
      processing: 0,
      sent: 0,
      skipped_window: 0,
      failed: 0,
    };
    for (const r of recipients ?? []) {
      if (r.broadcast_id !== broadcast.id) continue;
      const status = r.status as BroadcastRecipientStatus;
      counts[status === "processing" ? "pending" : status]++;
    }
    return { ...broadcast, counts };
  });
}

export async function getBroadcastWithRecipients(
  id: string
): Promise<{ broadcast: Broadcast; recipients: BroadcastRecipientWithContact[] } | null> {
  const supabase = await createClient();
  const { data: broadcast } = await supabase.from("broadcasts").select("*").eq("id", id).maybeSingle();
  if (!broadcast) return null;

  const { data: recipients } = await supabase
    .from("broadcast_recipients")
    .select("*, contacts(username, name)")
    .eq("broadcast_id", id)
    .order("created_at", { ascending: true });

  return { broadcast, recipients: (recipients ?? []) as unknown as BroadcastRecipientWithContact[] };
}
