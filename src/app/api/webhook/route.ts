import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
import {
  verifyWebhookSignature,
  verifyWebhookToken,
  type InstagramWebhookPayload,
} from "@/lib/meta/webhook";
import { getOrCreateContact, getOrCreateConversation } from "@/lib/data/contacts";
import {
  findMatchingAutomation,
  findNewContactAutomation,
  findStoryReplyAutomation,
  findStoryMentionAutomation,
} from "@/lib/automation/trigger-matcher";
import { startAutomationRun, resumeFromReply, resumeFromButtonTap } from "@/lib/automation/engine";
import type { RunContext } from "@/lib/automation/types";
import type { InstagramMessagingEvent } from "@/lib/meta/webhook";
import type { Automation, AutomationRun, InstagramAccount } from "@/types/database";

// GET /api/webhook — handshake de verificação (Seção 3 do app Meta).
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && verifyWebhookToken(token)) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// POST /api/webhook — recebe eventos de mensagens (`messaging`) e comentários
// (`changes`). Sempre responde 200 rapidamente: a Meta reenvia com backoff se
// não receber 200, então falhas de automação não devem travar o ACK.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as InstagramWebhookPayload;
  const admin = createAdminClient();

  for (const entry of payload.entry ?? []) {
    const { data: account } = await admin
      .from("instagram_accounts")
      .select("*")
      .eq("instagram_business_id", entry.id)
      .eq("status", "connected")
      .maybeSingle();

    await admin.from("webhook_events").insert({
      organization_id: account?.organization_id ?? null,
      instagram_account_id: account?.id ?? null,
      event_type: entry.messaging ? "messaging" : "comments",
      payload: entry as unknown as Record<string, unknown>,
      processed: Boolean(account),
    });

    if (!account) continue; // conta desconectada ou de outro app — ignora

    for (const event of entry.messaging ?? []) {
      if (!event.message || event.message.is_echo) continue; // mensagem enviada pela própria página
      // Menção em Story não tem `text`, só attachments — sem essa exceção o
      // guard de baixo (pensado pra DM normal) descartaria o evento inteiro.
      const hasStoryMention = event.message.attachments?.some((a) => a.type === "story_mention");
      if (!event.message.text && !hasStoryMention) continue;

      await handleIncomingMessage(admin, account, event.sender.id, event.message).catch((err) =>
        console.error("[webhook] handleIncomingMessage", err)
      );
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      if (change.value.parent_id) continue; // ignora respostas a respostas

      await handleIncomingComment(admin, account, change.value).catch((err) =>
        console.error("[webhook] handleIncomingComment", err)
      );
    }
  }

  return NextResponse.json({ received: true });
}

async function handleIncomingMessage(
  admin: ReturnType<typeof createAdminClient>,
  account: InstagramAccount,
  senderIgsid: string,
  message: NonNullable<InstagramMessagingEvent["message"]>
) {
  const storyMention = message.attachments?.find((a) => a.type === "story_mention");
  const isStoryReply = Boolean(message.reply_to?.story);
  const text = message.text ?? "";

  const { contact, isNew } = await getOrCreateContact({
    organizationId: account.organization_id,
    instagramAccountId: account.id,
    igsid: senderIgsid,
    markMessaged: true,
  });
  const conversation = await getOrCreateConversation({
    organizationId: account.organization_id,
    instagramAccountId: account.id,
    contactId: contact.id,
  });

  // A Meta reentrega webhooks quando o ACK demora; `instagram_message_id` é
  // unique, então uma reentrega da mesma DM só grava uma vez (RETURNING vem
  // vazio no conflito) e paramos aqui — sem isso a automação rodaria de novo.
  const { data: inserted } = await admin
    .from("messages")
    .upsert(
      {
        organization_id: account.organization_id,
        conversation_id: conversation.id,
        direction: "inbound",
        sender_type: "contact",
        message_type: storyMention ? "image" : "text",
        content: storyMention ? null : text,
        // A URL da mídia da Story expira em 24h — guardamos só o link (é o
        // que a Meta permite reter), nunca baixamos/cacheamos o arquivo.
        media_url: storyMention?.payload.url ?? null,
        instagram_message_id: message.mid,
        status: "delivered",
      },
      { onConflict: "instagram_message_id", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (!inserted) return;

  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversation.id);

  if (conversation.automation_paused) return;

  const ctx: RunContext = {
    organizationId: account.organization_id,
    instagramAccountId: account.id,
    igBusinessId: account.instagram_business_id,
    accessToken: decryptToken(account.access_token),
    contactId: contact.id,
    igsid: senderIgsid,
    conversationId: conversation.id,
    incomingText: text,
  };

  // Se o contato tem um run "waiting" parado num nó "Pergunta", esta mensagem
  // é a resposta esperada, não um novo gatilho — sem essa checagem, o texto
  // digitado seria testado contra as palavras-chave e provavelmente ignorado.
  // Não se aplica a menção em Story: não há texto nenhum pra usar como resposta.
  if (!storyMention) {
    const { data: waitingRun } = await admin
      .from("automation_runs")
      .select("*, automations(*)")
      .eq("contact_id", contact.id)
      .eq("status", "waiting")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (waitingRun) {
      const { automations: automation, ...run } = waitingRun as unknown as AutomationRun & { automations: Automation };
      const currentNode = automation.flow_definition.nodes.find((n) => n.id === run.current_node_id);
      if (currentNode?.type === "ask_question") {
        await resumeFromReply(run, automation, ctx, text);
        return;
      }
      if (currentNode?.type === "send_message") {
        const handled = await resumeFromButtonTap(run, automation, ctx, message.quick_reply?.payload ?? null, text);
        if (handled) return;
      }
    }
  }

  const automation = storyMention
    ? await findStoryMentionAutomation(account.id)
    : isStoryReply
      ? await findStoryReplyAutomation(account.id)
      : isNew
        ? (await findNewContactAutomation(account.id)) ??
          (await findMatchingAutomation({ instagramAccountId: account.id, triggerType: "dm_keyword", text }))
        : await findMatchingAutomation({ instagramAccountId: account.id, triggerType: "dm_keyword", text });

  if (automation) await startAutomationRun(automation, ctx);
}

async function handleIncomingComment(
  admin: ReturnType<typeof createAdminClient>,
  account: InstagramAccount,
  comment: { id: string; text: string; from: { id: string; username: string }; media: { id: string } }
) {
  const { contact } = await getOrCreateContact({
    organizationId: account.organization_id,
    instagramAccountId: account.id,
    igsid: comment.from.id,
    username: comment.from.username,
  });
  const conversation = await getOrCreateConversation({
    organizationId: account.organization_id,
    instagramAccountId: account.id,
    contactId: contact.id,
  });

  const { data: inserted } = await admin
    .from("messages")
    .upsert(
      {
        organization_id: account.organization_id,
        conversation_id: conversation.id,
        direction: "inbound",
        sender_type: "contact",
        message_type: "comment_reply",
        content: comment.text,
        instagram_message_id: comment.id,
        status: "delivered",
      },
      { onConflict: "instagram_message_id", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (!inserted) return; // reentrega da Meta do mesmo comentário

  if (conversation.automation_paused) return;

  const automation = await findMatchingAutomation({
    instagramAccountId: account.id,
    triggerType: "comment_keyword",
    text: comment.text,
    mediaId: comment.media.id,
  });
  if (!automation) return;

  const ctx: RunContext = {
    organizationId: account.organization_id,
    instagramAccountId: account.id,
    igBusinessId: account.instagram_business_id,
    accessToken: decryptToken(account.access_token),
    contactId: contact.id,
    igsid: comment.from.id,
    conversationId: conversation.id,
    incomingText: comment.text,
    incomingCommentId: comment.id,
  };

  await startAutomationRun(automation, ctx);
}
