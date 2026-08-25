import { createClient } from "@/lib/supabase/server";
import type { ContactStatus } from "@/types/database";

const MESSAGES_WINDOW_DAYS = 14;
const NEW_CONTACTS_WINDOW_DAYS = 30;

export const STATUS_FUNNEL_ORDER: ContactStatus[] = [
  "novo",
  "interessado",
  "qualificado",
  "lead_quente",
  "cliente",
];

export interface AnalyticsSummary {
  totalContacts: number;
  newContactsLast30d: number;
  outboundMessagesLast30d: number;
  conversionRate: number; // (lead_quente + cliente) / totalContacts, 0..1
  handoffCount: number;
  statusFunnel: Array<{ status: ContactStatus; count: number }>;
  lostCount: number;
  messagesByDay: Array<{ date: string; inbound: number; outbound: number }>;
  automationRanking: Array<{
    id: string;
    name: string;
    triggerType: string;
    keywords: string[];
    runCount: number;
    completedCount: number;
    failedCount: number;
  }>;
}

export async function getAnalyticsSummary(organizationId: string): Promise<AnalyticsSummary> {
  const supabase = await createClient();
  const now = new Date();
  const contactsWindowStart = new Date(now.getTime() - NEW_CONTACTS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const messagesWindowStart = new Date(now.getTime() - (MESSAGES_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000);
  messagesWindowStart.setHours(0, 0, 0, 0);

  const [{ data: contacts }, { data: messages }, { count: outboundLast30d }, { count: handoffCount }, { data: runs }] =
    await Promise.all([
      supabase.from("contacts").select("status, created_at").eq("organization_id", organizationId),
      supabase
        .from("messages")
        .select("direction, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", messagesWindowStart.toISOString()),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("direction", "outbound")
        .gte("created_at", contactsWindowStart.toISOString()),
      supabase
        .from("automation_logs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("node_type", "human_handoff")
        .eq("status", "success"),
      supabase
        .from("automation_runs")
        .select("automation_id, status, automations(name, trigger_type, trigger_config)")
        .eq("organization_id", organizationId)
        .eq("is_test", false), // runs do botão "Testar automação" não entram no ranking real
    ]);

  const totalContacts = contacts?.length ?? 0;
  const newContactsLast30d = (contacts ?? []).filter((c) => new Date(c.created_at) >= contactsWindowStart).length;
  const qualifiedOrBetter = (contacts ?? []).filter((c) => c.status === "lead_quente" || c.status === "cliente").length;
  const conversionRate = totalContacts > 0 ? qualifiedOrBetter / totalContacts : 0;
  const lostCount = (contacts ?? []).filter((c) => c.status === "perdido").length;

  const statusFunnel = STATUS_FUNNEL_ORDER.map((status) => ({
    status,
    count: (contacts ?? []).filter((c) => c.status === status).length,
  }));

  const dayBuckets: Record<string, { inbound: number; outbound: number }> = {};
  for (let i = 0; i < MESSAGES_WINDOW_DAYS; i++) {
    const d = new Date(messagesWindowStart.getTime() + i * 24 * 60 * 60 * 1000);
    dayBuckets[d.toISOString().slice(0, 10)] = { inbound: 0, outbound: 0 };
  }
  for (const m of messages ?? []) {
    const key = m.created_at.slice(0, 10);
    const bucket = dayBuckets[key];
    if (!bucket) continue;
    if (m.direction === "inbound") bucket.inbound++;
    else bucket.outbound++;
  }
  const messagesByDay = Object.entries(dayBuckets).map(([date, counts]) => ({ date, ...counts }));

  const byAutomation = new Map<
    string,
    { name: string; triggerType: string; keywords: string[]; runCount: number; completedCount: number; failedCount: number }
  >();
  for (const run of (runs ?? []) as unknown as Array<{
    automation_id: string;
    status: string;
    automations: { name: string; trigger_type: string; trigger_config: { keywords?: string[] } } | null;
  }>) {
    if (!run.automations) continue;
    const entry = byAutomation.get(run.automation_id) ?? {
      name: run.automations.name,
      triggerType: run.automations.trigger_type,
      keywords: run.automations.trigger_config?.keywords ?? [],
      runCount: 0,
      completedCount: 0,
      failedCount: 0,
    };
    entry.runCount++;
    if (run.status === "completed") entry.completedCount++;
    if (run.status === "failed") entry.failedCount++;
    byAutomation.set(run.automation_id, entry);
  }
  const automationRanking = Array.from(byAutomation.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.runCount - a.runCount);

  return {
    totalContacts,
    newContactsLast30d,
    outboundMessagesLast30d: outboundLast30d ?? 0,
    conversionRate,
    handoffCount: handoffCount ?? 0,
    statusFunnel,
    lostCount,
    messagesByDay,
    automationRanking,
  };
}
