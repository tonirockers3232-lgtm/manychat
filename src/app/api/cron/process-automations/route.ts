import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";
import { resumeAutomationRun } from "@/lib/automation/engine";
import type { RunContext } from "@/lib/automation/types";

const BATCH_SIZE = 25;

// GET /api/cron/process-automations — chamado por um cron externo
// (cron-job.org, a cada minuto; a Vercel Hobby só libera 1 cron próprio em
// vercel.json, já reservado para refresh-tokens). Processa os nós de "delay"
// cujo prazo venceu. Serverless não mantém timers vivos entre invocações,
// então todo delay do fluxo visual passa por uma linha em `pending_actions`
// em vez de um sleep.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: dueActions } = await admin
    .from("pending_actions")
    .select("*")
    .eq("status", "pending")
    .lte("run_at", new Date().toISOString())
    .order("run_at", { ascending: true })
    .limit(BATCH_SIZE);

  let processed = 0;

  for (const action of dueActions ?? []) {
    // Reivindica a linha antes de processar: se outra invocação do cron (Vercel
    // não garante exclusão mútua entre execuções sobrepostas) já pegou essa
    // mesma ação, o update abaixo afeta 0 linhas e pulamos — evita a
    // automação rodar (e enviar a mensagem) duas vezes para o mesmo delay.
    const { data: claimed } = await admin
      .from("pending_actions")
      .update({ status: "processing" })
      .eq("id", action.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (!claimed) continue;

    try {
      const { data: run } = await admin
        .from("automation_runs")
        .select("*")
        .eq("id", action.automation_run_id)
        .single();
      if (!run || run.status !== "waiting") {
        await admin.from("pending_actions").update({ status: "cancelled" }).eq("id", action.id);
        continue;
      }

      const { data: automation } = await admin
        .from("automations")
        .select("*")
        .eq("id", run.automation_id)
        .single();
      const { data: contact } = await admin
        .from("contacts")
        .select("*, instagram_accounts(*)")
        .eq("id", run.contact_id)
        .single();

      if (!automation || !contact || !contact.instagram_accounts) {
        await admin.from("pending_actions").update({ status: "failed" }).eq("id", action.id);
        continue;
      }

      const account = contact.instagram_accounts as unknown as {
        id: string;
        instagram_business_id: string;
        access_token: string;
      };

      const ctx: RunContext = {
        organizationId: run.organization_id,
        instagramAccountId: account.id,
        igBusinessId: account.instagram_business_id,
        accessToken: decryptToken(account.access_token),
        contactId: contact.id,
        igsid: contact.igsid,
        conversationId: run.conversation_id,
        incomingText: (run.context as { incomingText?: string })?.incomingText,
      };

      await resumeAutomationRun(run, automation, ctx);
      await admin.from("pending_actions").update({ status: "processed" }).eq("id", action.id);
      processed++;
    } catch (error) {
      console.error("[cron/process-automations]", action.id, error);
      await admin.from("pending_actions").update({ status: "failed" }).eq("id", action.id);
    }
  }

  return NextResponse.json({ processed, checked: dueActions?.length ?? 0 });
}
