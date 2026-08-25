import { createClient } from "@/lib/supabase/server";
import { listContactsWithRelations, matchesSegment } from "@/lib/data/segments";
import type { ContactWithRelations } from "@/lib/segment-match";
import type { BroadcastAudienceType } from "@/types/database";

// Resolve o público de um broadcast (todos os contatos da conta / uma tag /
// um segmento) na hora de enviar, não na hora de criar — a lista de
// destinatários é sempre um retrato fresco do momento do envio.
export async function resolveBroadcastAudience(params: {
  organizationId: string;
  instagramAccountId: string;
  audienceType: BroadcastAudienceType;
  audienceRef: string | null;
}): Promise<ContactWithRelations[]> {
  const contacts = await listContactsWithRelations(params.organizationId);
  const accountContacts = contacts.filter((c) => c.instagram_account_id === params.instagramAccountId);

  if (params.audienceType === "all") return accountContacts;

  if (params.audienceType === "tag" && params.audienceRef) {
    const supabase = await createClient();
    const { data: tag } = await supabase.from("tags").select("name").eq("id", params.audienceRef).maybeSingle();
    if (!tag) return [];
    return accountContacts.filter((c) => c.tagNames.includes(tag.name));
  }

  if (params.audienceType === "segment" && params.audienceRef) {
    const supabase = await createClient();
    const { data: segment } = await supabase
      .from("segments")
      .select("filter_rules")
      .eq("id", params.audienceRef)
      .maybeSingle();
    if (!segment) return [];
    return accountContacts.filter((c) => matchesSegment(c, segment.filter_rules));
  }

  return [];
}

// contacts.last_inbound_message_at é marcado apenas no caminho de DM real
// (ver getOrCreateContact({markMessaged: true})) — nunca por comentário, por
// mensagem enviada pela própria automação, nem por has_messaged (que é um
// flag histórico, não recente). Só isso reflete a janela de 24h da Meta.
export function isWithinMessagingWindow(lastInboundMessageAt: string | null): boolean {
  if (!lastInboundMessageAt) return false;
  return Date.now() - new Date(lastInboundMessageAt).getTime() < 24 * 60 * 60 * 1000;
}
