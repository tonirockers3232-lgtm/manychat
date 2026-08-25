import { createAdminClient } from "@/lib/supabase/admin";
import type { Automation, AutomationRun } from "@/types/database";
import type { AskQuestionNodeData, SendMessageNodeData, FlowDefinition } from "@/types/automation";
import { executeNode, saveQuestionAnswer } from "./actions";
import { normalize } from "./trigger-matcher";
import type { RunContext } from "./types";

const MAX_STEPS_PER_INVOCATION = 50; // trava contra loop infinito no flow

function findNextNodeId(flow: FlowDefinition, fromNodeId: string, branch?: string): string | null {
  const edge = flow.edges.find(
    (e) => e.source === fromNodeId && (branch === undefined || e.sourceHandle === branch)
  );
  return edge?.target ?? null;
}

async function logStep(
  supabase: ReturnType<typeof createAdminClient>,
  run: AutomationRun,
  nodeId: string,
  nodeType: string,
  status: "success" | "error" | "skipped",
  detail: Record<string, unknown> = {}
) {
  await supabase.from("automation_logs").insert({
    organization_id: run.organization_id,
    automation_run_id: run.id,
    node_id: nodeId,
    node_type: nodeType,
    action: nodeType,
    status,
    detail,
  });
}

// Dispara um novo run a partir do nó de gatilho de uma automação ativa.
export async function startAutomationRun(automation: Automation, ctx: RunContext): Promise<void> {
  const supabase = createAdminClient();
  const flow = automation.flow_definition;
  const triggerNode = flow.nodes.find((n) => n.type === "trigger");
  if (!triggerNode) return;

  const { data: run, error } = await supabase
    .from("automation_runs")
    .insert({
      organization_id: ctx.organizationId,
      automation_id: automation.id,
      contact_id: ctx.contactId,
      conversation_id: ctx.conversationId,
      status: "running",
      current_node_id: triggerNode.id,
      context: { incomingText: ctx.incomingText ?? null },
    })
    .select()
    .single();

  if (error || !run) return;

  await advanceRun(run, flow, ctx);
}

// Retoma um run que estava em "waiting" (pending_action venceu) e continua a
// partir do próximo nó após o delay.
export async function resumeAutomationRun(
  run: AutomationRun,
  automation: Automation,
  ctx: RunContext
): Promise<void> {
  const flow = automation.flow_definition;
  const nextNodeId = findNextNodeId(flow, run.current_node_id!);
  await advanceRun({ ...run, current_node_id: nextNodeId }, flow, ctx);
}

// Retoma um run que estava "waiting" num nó "Pergunta" — a mensagem recebida
// agora é a resposta do contato, não um novo gatilho. Salva no destino
// configurado no nó e continua o fluxo a partir do próximo passo.
export async function resumeFromReply(
  run: AutomationRun,
  automation: Automation,
  ctx: RunContext,
  replyText: string
): Promise<void> {
  const flow = automation.flow_definition;
  const questionNode = flow.nodes.find((n) => n.id === run.current_node_id);
  if (questionNode?.type === "ask_question") {
    const data = questionNode.data as AskQuestionNodeData;
    await saveQuestionAnswer(ctx.contactId, ctx.organizationId, data.saveTo, replyText.trim());
  }

  const nextNodeId = findNextNodeId(flow, run.current_node_id!);
  await advanceRun({ ...run, current_node_id: nextNodeId, context: { incomingText: replyText } }, flow, ctx);
}

// Retoma um run parado num nó "Enviar mensagem" com botões — a mensagem
// recebida é o toque num botão (ou, se o app do contato não confirma o
// payload, o texto digitado igual ao rótulo do botão). Retorna `false` sem
// mexer no run quando nada bate, para o webhook tratar como mensagem comum
// (ex: o contato ignorou os botões e mandou outra coisa).
export async function resumeFromButtonTap(
  run: AutomationRun,
  automation: Automation,
  ctx: RunContext,
  payload: string | null,
  typedText: string
): Promise<boolean> {
  const flow = automation.flow_definition;
  const node = flow.nodes.find((n) => n.id === run.current_node_id);
  if (node?.type !== "send_message") return false;

  const buttons = (node.data as SendMessageNodeData).quickReplies ?? [];
  if (!buttons.length) return false;

  const matchedId =
    (payload && buttons.find((b) => b.id === payload)?.id) ??
    buttons.find((b) => normalize(b.label) === normalize(typedText))?.id ??
    null;
  if (!matchedId) return false;

  const nextNodeId = findNextNodeId(flow, run.current_node_id!, matchedId);
  await advanceRun({ ...run, current_node_id: nextNodeId, context: { incomingText: typedText } }, flow, ctx);
  return true;
}

async function advanceRun(run: AutomationRun, flow: FlowDefinition, ctx: RunContext): Promise<void> {
  const supabase = createAdminClient();
  let currentNodeId = run.current_node_id;
  let finalStatus: AutomationRun["status"] = "completed";

  for (let step = 0; step < MAX_STEPS_PER_INVOCATION && currentNodeId; step++) {
    const node = flow.nodes.find((n) => n.id === currentNodeId);
    if (!node) {
      currentNodeId = null;
      break;
    }

    if (node.type === "trigger") {
      currentNodeId = findNextNodeId(flow, node.id);
      continue;
    }

    // Qualquer exceção não tratada aqui (nó malformado escapando da validação,
    // erro de rede/DB inesperado) antes tirava o run do loop sem nunca marcar
    // `automation_runs.status` como "failed" nem gravar um log — o run ficava
    // "running" pra sempre e nunca aparecia na página de Logs. Agora sempre
    // termina em um status terminal com o motivo registrado.
    let result;
    try {
      result = await executeNode(node, ctx, run);
    } catch (error) {
      await logStep(supabase, run, node.id, node.type, "error", {
        reason: error instanceof Error ? error.message : String(error),
        unexpected: true,
      });
      currentNodeId = null;
      finalStatus = "failed";
      break;
    }

    if (result.action === "wait") {
      await logStep(supabase, run, node.id, node.type, "success", { waiting: true });
      await supabase.from("pending_actions").insert({
        organization_id: ctx.organizationId,
        automation_run_id: run.id,
        next_node_id: result.nextNodeId,
        run_at: result.runAt,
      });
      finalStatus = "waiting";
      currentNodeId = node.id; // mantém o nó atual — resumeAutomationRun avança a partir dele
      break;
    }

    if (result.action === "ask") {
      await logStep(supabase, run, node.id, node.type, "success", { waitingReply: true });
      finalStatus = "waiting";
      currentNodeId = node.id; // resumeFromReply retoma a partir daqui quando a resposta chegar
      break;
    }

    if (result.action === "handoff") {
      await logStep(supabase, run, node.id, node.type, "success", { handoff: true });
      finalStatus = "completed";
      currentNodeId = null;
      break;
    }

    if (result.action === "stop") {
      await logStep(supabase, run, node.id, node.type, "error", { reason: result.reason });
      finalStatus = "failed";
      currentNodeId = null;
      break;
    }

    if (result.skipped) {
      await logStep(supabase, run, node.id, node.type, "skipped", { reason: result.skipped });
    } else {
      await logStep(supabase, run, node.id, node.type, "success");
    }
    currentNodeId = findNextNodeId(flow, node.id, result.branch);
  }

  if (currentNodeId && finalStatus !== "waiting") {
    // Estourou o limite de passos nesta invocação — o run continua "running"
    // e depende de uma nova invocação (ex: próxima mensagem do contato) para prosseguir.
    finalStatus = "running";
  }

  await supabase
    .from("automation_runs")
    .update({
      status: finalStatus,
      current_node_id: currentNodeId,
      finished_at: finalStatus === "completed" || finalStatus === "failed" ? new Date().toISOString() : null,
    })
    .eq("id", run.id);
}
