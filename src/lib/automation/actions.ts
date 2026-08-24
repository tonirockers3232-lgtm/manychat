import { createAdminClient } from "@/lib/supabase/admin";
import { sendDirectMessage, privateReplyToComment } from "@/lib/meta/instagram-api";
import { generateAiReply } from "@/lib/openai/client";
import type {
  FlowNode,
  SendMessageNodeData,
  ConditionNodeData,
  DelayNodeData,
  TagNodeData,
  AiReplyNodeData,
} from "@/types/automation";
import type { NodeExecutionResult, RunContext, RunLike } from "./types";

const DELAY_MULTIPLIER: Record<DelayNodeData["unit"], number> = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
};

export async function executeNode(
  node: FlowNode,
  ctx: RunContext,
  run: RunLike
): Promise<NodeExecutionResult> {
  switch (node.type) {
    case "send_message":
      return executeSendMessage(node.data as SendMessageNodeData, ctx);
    case "condition":
      return executeCondition(node.data as ConditionNodeData, ctx);
    case "delay":
      return executeDelay(node.id, node.data as DelayNodeData);
    case "add_tag":
      return executeTag(node.data as TagNodeData, ctx, "add");
    case "remove_tag":
      return executeTag(node.data as TagNodeData, ctx, "remove");
    case "ai_reply":
      return executeAiReply(node.data as AiReplyNodeData, ctx, run);
    default:
      return { action: "continue" };
  }
}

async function recordOutboundMessage(ctx: RunContext, text: string, senderType: "automation" | "ai") {
  if (!ctx.conversationId) return;
  const supabase = createAdminClient();
  await supabase.from("messages").insert({
    organization_id: ctx.organizationId,
    conversation_id: ctx.conversationId,
    direction: "outbound",
    sender_type: senderType,
    message_type: "text",
    content: text,
    status: "sent",
  });
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", ctx.conversationId);
}

// Único ponto que decide COMO uma resposta sai: se o run começou por um
// comentário (ctx.incomingCommentId setado), tem que ir pela reply privada
// vinculada ao comentário — a Send API padrão costuma ser rejeitada pela Meta
// fora da janela de 24h de DM para quem só comentou, nunca abriu conversa.
// Usada tanto pelo nó "Enviar mensagem" quanto pelo "Resposta com IA", que
// antes divergiam nisso (o de IA sempre mandava DM padrão, mesmo vindo de comentário).
async function sendOutboundText(ctx: RunContext, text: string): Promise<void> {
  if (ctx.incomingCommentId) {
    await privateReplyToComment({
      accessToken: ctx.accessToken,
      igBusinessId: ctx.igBusinessId,
      commentId: ctx.incomingCommentId,
      text,
    });
  } else {
    await sendDirectMessage({
      accessToken: ctx.accessToken,
      igBusinessId: ctx.igBusinessId,
      recipientIgsid: ctx.igsid,
      text,
    });
  }
}

async function executeSendMessage(
  data: SendMessageNodeData,
  ctx: RunContext
): Promise<NodeExecutionResult> {
  const text = data.text?.trim();
  if (!text) return { action: "continue", skipped: "Nó 'Enviar mensagem' sem texto configurado" };

  try {
    await sendOutboundText(ctx, text);
    await recordOutboundMessage(ctx, text, "automation");
    return { action: "continue" };
  } catch (error) {
    return { action: "stop", reason: (error as Error).message };
  }
}

async function executeCondition(
  data: ConditionNodeData,
  ctx: RunContext
): Promise<NodeExecutionResult> {
  const supabase = createAdminClient();
  let matched = false;

  if (data.field === "message_contains") {
    const haystack = (ctx.incomingText ?? "").toLowerCase();
    const needle = (data.value ?? "").toLowerCase();
    matched = data.operator === "contains" ? haystack.includes(needle) : haystack === needle;
  } else if (data.field === "has_tag") {
    const { data: rows } = await supabase
      .from("contact_tags")
      .select("tag_id, tags!inner(name)")
      .eq("contact_id", ctx.contactId)
      .eq("tags.name", data.value ?? "");
    matched = (rows?.length ?? 0) > 0;
  } else if (data.field === "is_follower") {
    // instagram_business_basic não expõe status de "seguidor" diretamente;
    // tratado como sempre verdadeiro até existir um campo dedicado no contato.
    matched = true;
  }

  if (data.operator === "not_equals") matched = !matched;

  return { action: "continue", branch: matched ? "true" : "false" };
}

function executeDelay(nodeId: string, data: DelayNodeData): NodeExecutionResult {
  const runAt = new Date(Date.now() + data.amount * DELAY_MULTIPLIER[data.unit]).toISOString();
  return { action: "wait", nextNodeId: nodeId, runAt };
}

async function executeTag(
  data: TagNodeData,
  ctx: RunContext,
  mode: "add" | "remove"
): Promise<NodeExecutionResult> {
  const supabase = createAdminClient();

  const { data: tag } = await supabase
    .from("tags")
    .upsert(
      { organization_id: ctx.organizationId, name: data.tagName },
      { onConflict: "organization_id,name", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (!tag) return { action: "continue" };

  if (mode === "add") {
    await supabase.from("contact_tags").upsert({ contact_id: ctx.contactId, tag_id: tag.id });
  } else {
    await supabase.from("contact_tags").delete().match({ contact_id: ctx.contactId, tag_id: tag.id });
  }

  return { action: "continue" };
}

async function executeAiReply(
  data: AiReplyNodeData,
  ctx: RunContext,
  run: RunLike
): Promise<NodeExecutionResult> {
  const supabase = createAdminClient();

  const { data: settings } = data.aiSettingsId
    ? await supabase.from("ai_settings").select("*").eq("id", data.aiSettingsId).single()
    : await supabase
        .from("ai_settings")
        .select("*")
        .eq("organization_id", ctx.organizationId)
        .eq("is_default", true)
        .single();

  if (!settings) {
    if (data.fallbackText) await recordOutboundMessage(ctx, data.fallbackText, "ai");
    return { action: "continue" };
  }

  const { data: historyRows } = ctx.conversationId
    ? await supabase
        .from("messages")
        .select("direction, content")
        .eq("conversation_id", ctx.conversationId)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  const history = (historyRows ?? [])
    .reverse()
    .filter((m) => m.content)
    .map((m) => ({
      role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
      content: m.content as string,
    }));

  try {
    const reply = await generateAiReply({
      systemPrompt: settings.system_prompt,
      model: settings.model,
      temperature: Number(settings.temperature),
      history,
      userMessage: ctx.incomingText ?? "",
    });

    const finalText = reply || data.fallbackText || "";
    if (finalText) {
      await sendOutboundText(ctx, finalText);
      await recordOutboundMessage(ctx, finalText, "ai");
    }
    return { action: "continue" };
  } catch (error) {
    void run; // reservado para logging futuro por run
    return { action: "stop", reason: (error as Error).message };
  }
}
