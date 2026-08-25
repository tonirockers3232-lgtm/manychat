import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
import { sendDirectMessage } from "@/lib/meta/instagram-api";
import { buildContactVariables, renderTemplate } from "@/lib/automation/variables";
import { isWithinMessagingWindow } from "@/lib/data/broadcast-audience";

const BATCH_SIZE = 25;

// GET /api/cron/process-broadcasts — chamado por um cron externo (cron-job.org,
// mesmo esquema do process-automations: a Vercel Hobby só libera 1 cron
// próprio em vercel.json, já reservado para refresh-tokens). Processa até
// BATCH_SIZE destinatários pendentes por execução — nunca manda tudo de uma
// vez, tanto por causa do timeout de função serverless quanto pra não
// estourar rate limit da Graph API.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("broadcast_recipients")
    .select("*, broadcasts(message_text, instagram_account_id), contacts(igsid, last_inbound_message_at)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of pending ?? []) {
    // Reivindica a linha antes de processar — mesma proteção contra
    // execuções sobrepostas do process-automations, pra nunca mandar a
    // mesma DM duas vezes se o cron rodar de novo antes deste terminar.
    const { data: claimed } = await admin
      .from("broadcast_recipients")
      .update({ status: "processing" })
      .eq("id", row.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();
    if (!claimed) continue;

    const broadcast = row.broadcasts as unknown as { message_text: string; instagram_account_id: string } | null;
    const contact = row.contacts as unknown as { igsid: string; last_inbound_message_at: string | null } | null;

    if (!broadcast || !contact) {
      await admin.from("broadcast_recipients").update({ status: "failed", detail: "Contato ou broadcast não encontrado" }).eq("id", row.id);
      failed++;
      continue;
    }

    if (!isWithinMessagingWindow(contact.last_inbound_message_at)) {
      await admin
        .from("broadcast_recipients")
        .update({ status: "skipped_window", detail: "Contato não mandou DM nas últimas 24h — Meta não libera enviar" })
        .eq("id", row.id);
      skipped++;
      continue;
    }

    try {
      const { data: account } = await admin
        .from("instagram_accounts")
        .select("instagram_business_id, access_token")
        .eq("id", broadcast.instagram_account_id)
        .single();
      if (!account) throw new Error("Conta do Instagram não encontrada");

      const variables = await buildContactVariables(row.contact_id);
      const text = renderTemplate(broadcast.message_text, variables);

      await sendDirectMessage({
        accessToken: decryptToken(account.access_token),
        igBusinessId: account.instagram_business_id,
        recipientIgsid: contact.igsid,
        text,
      });

      await admin.from("broadcast_recipients").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id);
      sent++;
    } catch (error) {
      console.error("[cron/process-broadcasts]", row.id, error);
      await admin
        .from("broadcast_recipients")
        .update({ status: "failed", detail: error instanceof Error ? error.message : "Erro desconhecido" })
        .eq("id", row.id);
      failed++;
    }
  }

  // Fecha o broadcast quando não sobra nenhum destinatário pendente/em
  // processamento — não precisa ser nesta mesma execução do cron, a próxima
  // pega quem ficou faltando.
  const { data: stillOpen } = await admin.from("broadcasts").select("id").eq("status", "sending");
  for (const b of stillOpen ?? []) {
    const { count } = await admin
      .from("broadcast_recipients")
      .select("id", { count: "exact", head: true })
      .eq("broadcast_id", b.id)
      .in("status", ["pending", "processing"]);
    if (count === 0) {
      await admin.from("broadcasts").update({ status: "completed" }).eq("id", b.id);
    }
  }

  return NextResponse.json({ checked: pending?.length ?? 0, sent, skipped, failed });
}
