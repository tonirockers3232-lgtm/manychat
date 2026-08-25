"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { flowDefinitionSchema } from "@/lib/validations/automation";
import { logAudit } from "@/lib/audit";
import type { AutomationStatus, AutomationTriggerType } from "@/types/database";
import type { FlowDefinition } from "@/types/automation";

function defaultFlowFor(triggerType: AutomationTriggerType): FlowDefinition {
  return {
    nodes: [{ id: "trigger-1", type: "trigger", position: { x: 250, y: 0 }, data: { triggerType, keywords: [], matchType: "contains" } }],
    edges: [],
  };
}

export async function createAutomation(params: { name: string; triggerType: AutomationTriggerType; instagramAccountId: string | null }) {
  const organization = await getCurrentOrganization();
  if (!organization) throw new Error("Organização não encontrada");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("automations")
    .insert({
      organization_id: organization.id,
      instagram_account_id: params.instagramAccountId,
      name: params.name,
      trigger_type: params.triggerType,
      trigger_config: {},
      flow_definition: defaultFlowFor(params.triggerType),
      created_by: user?.id,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Falha ao criar automação");

  await logAudit({
    organizationId: organization.id,
    action: "created",
    entityType: "automation",
    entityId: data.id,
    entityName: data.name,
  });

  revalidatePath("/dashboard/automations");
  return data;
}

export async function updateAutomationFlow(id: string, flowDefinition: FlowDefinition) {
  const parsed = flowDefinitionSchema.safeParse(flowDefinition);
  if (!parsed.success) {
    throw new Error(`Fluxo inválido: ${parsed.error.issues[0]?.message ?? "formato inesperado"}`);
  }

  // O motor de automação (`findMatchingAutomation`) lê `automations.trigger_config`,
  // não o nó de gatilho dentro de `flow_definition` — sem essa sincronização, uma
  // automação salva com keywords no editor visual nunca dispara (trigger_config
  // fica `{}` desde a criação, keywords.length === 0, gatilho ignorado em silêncio).
  const triggerNode = parsed.data.nodes.find((n) => n.type === "trigger");
  const triggerConfig =
    triggerNode?.type === "trigger"
      ? { keywords: triggerNode.data.keywords ?? [], match_type: triggerNode.data.matchType ?? "contains" }
      : {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automations")
    .update({ flow_definition: parsed.data, trigger_config: triggerConfig })
    .eq("id", id)
    .select("organization_id, name")
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    organizationId: data.organization_id,
    action: "updated",
    entityType: "automation",
    entityId: id,
    entityName: data.name,
    detail: { nodes: parsed.data.nodes.length, edges: parsed.data.edges.length },
  });

  revalidatePath(`/dashboard/automations/${id}`);
}

export async function updateAutomationStatus(id: string, status: AutomationStatus) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automations")
    .update({ status })
    .eq("id", id)
    .select("organization_id, name")
    .single();
  if (error) throw new Error(error.message);

  await logAudit({
    organizationId: data.organization_id,
    action: "status_changed",
    entityType: "automation",
    entityId: id,
    entityName: data.name,
    detail: { status },
  });

  revalidatePath("/dashboard/automations");
  revalidatePath(`/dashboard/automations/${id}`);
}

export async function deleteAutomation(id: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("automations").select("organization_id, name").eq("id", id).single();

  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (existing) {
    await logAudit({
      organizationId: existing.organization_id,
      action: "deleted",
      entityType: "automation",
      entityId: null,
      entityName: existing.name,
    });
  }

  revalidatePath("/dashboard/automations");
}
