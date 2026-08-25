import { createAdminClient } from "@/lib/supabase/admin";
import { sendDirectMessage, privateReplyToComment, replyToComment, type QuickReply } from "@/lib/meta/instagram-api";
import { generateAiReply } from "@/lib/openai/client";
import { normalize } from "./trigger-matcher";
import { buildContactVariables, renderTemplate } from "./variables";
import type {
  FlowNode,
  SendMessageNodeData,
  ConditionNodeData,
  RandomSplitNodeData,
  DelayNodeData,
  TagNodeData,
  AiReplyNodeData,
  AskQuestionNodeData,
  ReplyCommentNodeData,
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
    case "random_split":
      return executeRandomSplit(node.data as RandomSplitNodeData);
    case "delay":
      return executeDelay(node.id, node.data as DelayNodeData);
    case "add_tag":
      return executeTag(node.data as TagNodeData, ctx, "add");
    case "remove_tag":
      return executeTag(node.data as TagNodeData, ctx, "remove");
    case "ai_reply":
      return executeAiReply(node.data as AiReplyNodeData, ctx, run);
    case "ask_question":
      return executeAskQuestion(node.data as AskQuestionNodeData, ctx);
    case "reply_comment":
      return executeReplyComment(node.data as ReplyCommentNodeData, ctx);
    case "human_handoff":
      return executeHumanHandoff(ctx);
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
async function sendOutboundText(ctx: RunContext, text: string, quickReplies?: QuickReply[]): Promise<void> {
  if (ctx.incomingCommentId) {
    // A resposta privada a comentário não documenta suporte a quick_replies —
    // ignorado nesse caminho em vez de arriscar um payload que a Meta rejeite.
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
      quickReplies,
    });
  }
}

async function executeSendMessage(
  data: SendMessageNodeData,
  ctx: RunContext
): Promise<NodeExecutionResult> {
  const raw = data.text?.trim();
  if (!raw) return { action: "continue", skipped: "Nó 'Enviar mensagem' sem texto configurado" };

  try {
    const text = renderTemplate(raw, await buildContactVariables(ctx.contactId));
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
  } else if (data.field === "custom_field" && data.customFieldKey) {
    const { data: row } = await supabase
      .from("custom_field_values")
      .select("value, custom_fields!inner(key)")
      .eq("contact_id", ctx.contactId)
      .eq("custom_fields.key", data.customFieldKey)
      .maybeSingle();
    const haystack = normalize((row?.value as string | undefined) ?? "");
    const needle = normalize(data.value ?? "");
    matched = data.operator === "contains" ? haystack.includes(needle) : haystack === needle;
  }

  if (data.operator === "not_equals") matched = !matched;

  return { action: "continue", branch: matched ? "true" : "false" };
}

function executeRandomSplit(data: RandomSplitNodeData): NodeExecutionResult {
  const splitPercent = Math.min(100, Math.max(0, data.splitPercent ?? 50));
  const branch = Math.random() * 100 < splitPercent ? "a" : "b";
  return { action: "continue", branch };
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

// Botões de quick reply (docs: Instagram Platform → Messaging API → Quick
// Replies) só existem no caminho de DM — a resposta privada a comentário não
// os documenta. Quando o run veio de um comentário, cai pro texto simples
// "Responda com: ..." de sempre.
function buildQuickReplies(data: AskQuestionNodeData, isDm: boolean): QuickReply[] | undefined {
  if (!isDm) return undefined;

  if (data.inputType === "choice" && data.choices?.length) {
    return data.choices.slice(0, 13).map((choice) => ({
      content_type: "text",
      title: choice.slice(0, 20),
      payload: choice.slice(0, 1000),
    }));
  }
  if (data.inputType === "phone") {
    return [{ content_type: "user_phone_number", title: "Usar meu telefone", payload: "phone" }];
  }
  if (data.inputType === "email") {
    return [{ content_type: "user_email", title: "Usar meu e-mail", payload: "email" }];
  }
  return undefined;
}

async function executeAskQuestion(
  data: AskQuestionNodeData,
  ctx: RunContext
): Promise<NodeExecutionResult> {
  let question = data.question?.trim();
  if (!question) return { action: "continue", skipped: "Nó 'Pergunta' sem texto configurado" };

  const quickReplies = buildQuickReplies(data, !ctx.incomingCommentId);

  // Sem quick replies (comentário, ou tipo sem botão equivalente), mantém a
  // lista de opções no próprio texto — é a única forma de mostrar as opções.
  if (data.inputType === "choice" && data.choices?.length && !quickReplies) {
    question += `\n\nResponda com: ${data.choices.join(", ")}`;
  }

  try {
    const text = renderTemplate(question, await buildContactVariables(ctx.contactId));
    await sendOutboundText(ctx, text, quickReplies);
    await recordOutboundMessage(ctx, text, "automation");
    return { action: "ask" };
  } catch (error) {
    return { action: "stop", reason: (error as Error).message };
  }
}

// Salva a resposta do contato no destino configurado no nó "Pergunta" que
// gerou a pausa — colunas nativas de contacts (phone/email/name) ou, para
// qualquer outra chave, upsert em custom_field_values.
export async function saveQuestionAnswer(contactId: string, organizationId: string, saveTo: string, answer: string): Promise<void> {
  const supabase = createAdminClient();

  if (saveTo === "phone" || saveTo === "email" || saveTo === "name") {
    await supabase.from("contacts").update({ [saveTo]: answer }).eq("id", contactId);
    return;
  }

  const { data: field } = await supabase
    .from("custom_fields")
    .upsert({ organization_id: organizationId, key: saveTo, label: saveTo }, { onConflict: "organization_id,key", ignoreDuplicates: true })
    .select()
    .single();

  const fieldId =
    field?.id ??
    (
      await supabase
        .from("custom_fields")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("key", saveTo)
        .single()
    ).data?.id;

  if (!fieldId) return;

  await supabase
    .from("custom_field_values")
    .upsert({ contact_id: contactId, custom_field_id: fieldId, value: answer, updated_at: new Date().toISOString() });
}

async function executeReplyComment(
  data: ReplyCommentNodeData,
  ctx: RunContext
): Promise<NodeExecutionResult> {
  const raw = data.text?.trim();
  if (!raw) return { action: "continue", skipped: "Nó 'Responder comentário' sem texto configurado" };
  if (!ctx.incomingCommentId) {
    return { action: "continue", skipped: "Nó 'Responder comentário' só funciona em automações disparadas por comentário" };
  }

  try {
    const text = renderTemplate(raw, await buildContactVariables(ctx.contactId));
    await replyToComment({ accessToken: ctx.accessToken, commentId: ctx.incomingCommentId, message: text });
    return { action: "continue" };
  } catch (error) {
    return { action: "stop", reason: (error as Error).message };
  }
}

async function executeHumanHandoff(ctx: RunContext): Promise<NodeExecutionResult> {
  const supabase = createAdminClient();
  const text = "🙋 Conversa encaminhada para atendimento humano.";

  if (ctx.conversationId) {
    await supabase.from("conversations").update({ automation_paused: true }).eq("id", ctx.conversationId);
    try {
      await sendOutboundText(ctx, text);
    } catch {
      // A pausa da automação (acima) já aconteceu e é o efeito que importa;
      // se o aviso ao contato falhar (ex: fora da janela de 24h de DM), o
      // atendente ainda vê o handoff pela Caixa de entrada.
    }
    await recordOutboundMessage(ctx, text, "automation");
  }

  return { action: "handoff" };
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
    if (data.fallbackText) {
      const text = renderTemplate(data.fallbackText, await buildContactVariables(ctx.contactId));
      await recordOutboundMessage(ctx, text, "ai");
    }
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
