"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, MessageSquare, GitBranch, Clock, Tag, TagIcon, Sparkles, HelpCircle, Reply, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FlowNodeType,
  FlowNodeData,
  SendMessageNodeData,
  ConditionNodeData,
  DelayNodeData,
  TagNodeData,
  TriggerNodeData,
  AskQuestionNodeData,
  ReplyCommentNodeData,
} from "@/types/automation";

const NODE_META: Record<FlowNodeType, { label: string; icon: typeof Zap; color: string }> = {
  trigger: { label: "Gatilho", icon: Zap, color: "border-amber-400 bg-amber-50" },
  send_message: { label: "Enviar mensagem", icon: MessageSquare, color: "border-blue-400 bg-blue-50" },
  condition: { label: "Condição", icon: GitBranch, color: "border-purple-400 bg-purple-50" },
  delay: { label: "Aguardar", icon: Clock, color: "border-orange-400 bg-orange-50" },
  add_tag: { label: "Adicionar tag", icon: Tag, color: "border-emerald-400 bg-emerald-50" },
  remove_tag: { label: "Remover tag", icon: TagIcon, color: "border-rose-400 bg-rose-50" },
  ai_reply: { label: "Resposta com IA", icon: Sparkles, color: "border-violet-400 bg-violet-50" },
  ask_question: { label: "Pergunta", icon: HelpCircle, color: "border-cyan-400 bg-cyan-50" },
  reply_comment: { label: "Responder comentário", icon: Reply, color: "border-sky-400 bg-sky-50" },
  human_handoff: { label: "Atendimento humano", icon: UserCheck, color: "border-red-400 bg-red-50" },
};

function summarize(type: FlowNodeType, data: FlowNodeData): string {
  switch (type) {
    case "trigger": {
      const d = data as TriggerNodeData;
      return d.keywords?.length ? `Palavras: ${d.keywords.join(", ")}` : "Sem palavra-chave definida";
    }
    case "send_message":
      return (data as SendMessageNodeData).text?.slice(0, 60) || "Sem texto definido";
    case "condition": {
      const d = data as ConditionNodeData;
      return `${d.field} ${d.operator} "${d.value}"`;
    }
    case "delay": {
      const d = data as DelayNodeData;
      return `${d.amount} ${d.unit}`;
    }
    case "add_tag":
    case "remove_tag":
      return (data as TagNodeData).tagName || "Sem tag definida";
    case "ai_reply":
      return "Responder usando IA configurada";
    case "ask_question":
      return (data as AskQuestionNodeData).question?.slice(0, 60) || "Sem pergunta definida";
    case "reply_comment":
      return (data as ReplyCommentNodeData).text?.slice(0, 60) || "Sem texto definido";
    case "human_handoff":
      return "Pausa a automação e encaminha para atendimento humano";
    default:
      return "";
  }
}

export function AutomationNode({ data, type, selected }: NodeProps) {
  const nodeType = type as FlowNodeType;
  const meta = NODE_META[nodeType];
  const Icon = meta.icon;
  const summaryText = summarize(nodeType, data as unknown as FlowNodeData);

  return (
    <div
      className={cn(
        "w-56 rounded-lg border-2 bg-background p-3 shadow-sm transition-shadow",
        meta.color,
        selected && "ring-2 ring-primary ring-offset-1"
      )}
    >
      {nodeType !== "trigger" && <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />}

      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
      </div>
      <p className="mt-1.5 truncate text-sm text-foreground" title={summaryText}>
        {summaryText}
      </p>

      {nodeType === "condition" ? (
        <div className="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
          <span>Sim</span>
          <span>Não</span>
        </div>
      ) : null}

      {nodeType === "condition" ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" className="!left-6 !bg-emerald-500" />
          <Handle type="source" position={Position.Bottom} id="false" className="!left-auto !right-6 !bg-rose-500" />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
      )}
    </div>
  );
}

export const nodeTypes = {
  trigger: AutomationNode,
  send_message: AutomationNode,
  condition: AutomationNode,
  delay: AutomationNode,
  add_tag: AutomationNode,
  remove_tag: AutomationNode,
  ai_reply: AutomationNode,
  ask_question: AutomationNode,
  reply_comment: AutomationNode,
  human_handoff: AutomationNode,
};

export { NODE_META };
