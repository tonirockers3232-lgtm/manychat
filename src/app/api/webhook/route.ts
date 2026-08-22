import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
import {
  verifyWebhookSignature,
  verifyWebhookToken,
  type InstagramWebhookPayload,
} from "@/lib/meta/webhook";
import { getOrCreateContact, getOrCreateConversation } from "@/lib/data/contacts";
import { findMatchingAutomation, findNewContactAutomation } from "@/lib/automation/trigger-matcher";
import { startAutomationRun } from "@/lib/automation/engine";
import type { RunContext } from "@/lib/automation/types";
import type { InstagramAccount } from "@/types/database";

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
      if (event.message?.is_echo) continue; // mensagem enviada pela própria página
      if (!event.message?.text) continue;

      await handleIncomingMessage(admin, account, event.sender.id, event.message.mid, event.message.text).catch(
        (err) => console.error("[webhook] handleIncomingMessage", err)
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
  mid: string,
  text: string
) {
  const { contact, isNew } = await getOrCreateContact({
    organizationId: account.organization_id,
    instagramAccountId: account.id,
    igsid: senderIgsid,
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
        message_type: "text",
        content: text,
        instagram_message_id: mid,
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

  const automation = isNew
    ? (await findNewContactAutomation(account.id)) ?? (await findMatchingAutomation({
        instagramAccountId: account.id,
        triggerType: "dm_keyword",
        text,
      }))
    : await findMatchingAutomation({ instagramAccountId: account.id, triggerType: "dm_keyword", text });

  if (automation) await startAutomationRun(automation, ctx);
}

async function handleIncomingComment(
  admin: ReturnType<typeof createAdminClient>,
  account: InstagramAccount,
  comment: { id: string; text: string; from: { id: string; username: string } }
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
