"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { getOrCreateConversation } from "@/lib/data/contacts";
import { flowDefinitionSchema } from "@/lib/validations/automation";
import { logAudit } from "@/lib/audit";
import { deriveTriggerConfig } from "@/lib/automation/flow-utils";
import { getAutomationTemplate } from "@/lib/automation/templates";
import { startAutomationRun } from "@/lib/automation/engine";
import type { AutomationStatus, AutomationTriggerType } from "@/types/database";
import type { FlowDefinition } from "@/types/automation";
import type { RunContext } from "@/lib/automation/types";

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

export async function createAutomationFromTemplate(params: { templateId: string; name: string; instagramAccountId: string | null }) {
  const template = getAutomationTemplate(params.templateId);
  if (!template) throw new Error("Modelo não encontrado");

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
      trigger_type: template.triggerType,
      trigger_config: deriveTriggerConfig(template.flow),
      flow_definition: template.flow,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Falha ao criar automação a partir do modelo");

  await logAudit({
    organizationId: organization.id,
    action: "created",
    entityType: "automation",
    entityId: data.id,
    entityName: data.name,
    detail: { fromTemplate: template.id },
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
  const triggerConfig = deriveTriggerConfig(parsed.data);

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

// Roda o fluxo salvo de uma automação pra um contato real escolhido à mão,
// sem precisar que ele mande uma DM/comentário de verdade pra disparar o
// gatilho. Reusa `startAutomationRun` — mesmo motor, mesmos nós, mensagens
// realmente enviadas pela Graph API — só pula a etapa de casar o gatilho.
// `is_test: true` no run resultante é o que deixa Analytics excluir isso do
// ranking de automações sem esconder o histórico da página de Logs.
export async function testAutomationRun(params: {
  automationId: string;
  contactId: string;
  simulatedText?: string;
}) {
  const supabase = await createClient();

  const { data: automation, error: automationError } = await supabase
    .from("automations")
    .select("*")
    .eq("id", params.automationId)
    .single();
  if (automationError || !automation) throw new Error("Automação não encontrada");
  if (!automation.instagram_account_id) throw new Error("Esta automação não tem uma conta do Instagram vinculada");

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", params.contactId)
    .single();
  if (contactError || !contact) throw new Error("Contato não encontrado");
  if (contact.instagram_account_id !== automation.instagram_account_id) {
    throw new Error("Esse contato não pertence à mesma conta do Instagram desta automação");
  }

  const { data: account, error: accountError } = await supabase
    .from("instagram_accounts")
    .select("instagram_business_id, access_token, status")
    .eq("id", automation.instagram_account_id)
    .single();
  if (accountError || !account) throw new Error("Conta do Instagram não encontrada");
  if (account.status !== "connected") throw new Error("Conta do Instagram desconectada — reconecte antes de testar");

  const conversation = await getOrCreateConversation({
    organizationId: automation.organization_id,
    instagramAccountId: automation.instagram_account_id,
    contactId: contact.id,
  });

  const ctx: RunContext = {
    organizationId: automation.organization_id,
    instagramAccountId: automation.instagram_account_id,
    igBusinessId: account.instagram_business_id,
    accessToken: decryptToken(account.access_token),
    contactId: contact.id,
    igsid: contact.igsid,
    conversationId: conversation.id,
    incomingText: params.simulatedText?.trim() || undefined,
    isTest: true,
  };

  await startAutomationRun(automation, ctx);

  revalidatePath("/dashboard/logs");
  revalidatePath("/dashboard/inbox");
}
