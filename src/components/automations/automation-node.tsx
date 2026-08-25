"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, MessageSquare, GitBranch, Shuffle, Clock, Tag, TagIcon, Sparkles, HelpCircle, Reply, UserCheck, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FlowNodeType,
  FlowNodeData,
  SendMessageNodeData,
  ConditionNodeData,
  RandomSplitNodeData,
  DelayNodeData,
  TagNodeData,
  TriggerNodeData,
  AskQuestionNodeData,
  ReplyCommentNodeData,
  StartAutomationNodeData,
} from "@/types/automation";

const NODE_META: Record<FlowNodeType, { label: string; icon: typeof Zap; color: string }> = {
  trigger: { label: "Gatilho", icon: Zap, color: "border-amber-400 bg-amber-50" },
  send_message: { label: "Enviar mensagem", icon: MessageSquare, color: "border-blue-400 bg-blue-50" },
  condition: { label: "Condição", icon: GitBranch, color: "border-purple-400 bg-purple-50" },
  random_split: { label: "Divisão aleatória", icon: Shuffle, color: "border-indigo-400 bg-indigo-50" },
  delay: { label: "Aguardar", icon: Clock, color: "border-orange-400 bg-orange-50" },
  add_tag: { label: "Adicionar tag", icon: Tag, color: "border-emerald-400 bg-emerald-50" },
  remove_tag: { label: "Remover tag", icon: TagIcon, color: "border-rose-400 bg-rose-50" },
  ai_reply: { label: "Resposta com IA", icon: Sparkles, color: "border-violet-400 bg-violet-50" },
  ask_question: { label: "Pergunta", icon: HelpCircle, color: "border-cyan-400 bg-cyan-50" },
  reply_comment: { label: "Responder comentário", icon: Reply, color: "border-sky-400 bg-sky-50" },
  human_handoff: { label: "Atendimento humano", icon: UserCheck, color: "border-red-400 bg-red-50" },
  start_automation: { label: "Iniciar automação", icon: Rocket, color: "border-teal-400 bg-teal-50" },
};

const UNCONDITIONAL_TRIGGER_LABEL: Partial<Record<TriggerNodeData["triggerType"], string>> = {
  new_contact: "Novo contato",
  story_reply: "Resposta a Story",
  story_mention: "Menção em Story",
  manual: "Início manual (via outra automação)",
};

function summarize(type: FlowNodeType, data: FlowNodeData): string {
  switch (type) {
    case "trigger": {
      const d = data as TriggerNodeData;
      const unconditionalLabel = UNCONDITIONAL_TRIGGER_LABEL[d.triggerType];
      if (unconditionalLabel) return unconditionalLabel;
      const keywordsLabel = d.keywords?.length ? `Palavras: ${d.keywords.join(", ")}` : "Sem palavra-chave definida";
      if (d.triggerType === "comment_keyword" && d.mediaId) {
        return `${keywordsLabel} · só neste post`;
      }
      return keywordsLabel;
    }
    case "send_message":
      return (data as SendMessageNodeData).text?.slice(0, 60) || "Sem texto definido";
    case "condition": {
      const d = data as ConditionNodeData;
      if (d.field === "is_follower") return "É seguidor da conta?";
      return `${d.field} ${d.operator} "${d.value}"`;
    }
    case "random_split": {
      const d = data as RandomSplitNodeData;
      return `${d.splitPercent}% A / ${100 - d.splitPercent}% B`;
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
    case "start_automation":
      return (data as StartAutomationNodeData).targetAutomationName || "Sem automação de destino selecionada";
    default:
      return "";
  }
}

export function AutomationNode({ data, type, selected }: NodeProps) {
  const nodeType = type as FlowNodeType;
  const meta = NODE_META[nodeType];
  const Icon = meta.icon;
  const summaryText = summarize(nodeType, data as unknown as FlowNodeData);
  const buttons =
    nodeType === "send_message"
      ? ((data as unknown as SendMessageNodeData).quickReplies ?? []).filter((b) => b.label?.trim())
      : [];

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
      {nodeType === "random_split" ? (
        <div className="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
          <span>A</span>
          <span>B</span>
        </div>
      ) : null}
      {buttons.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {buttons.map((b) => (
            <span key={b.id} className="rounded border border-blue-300 bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
              {b.label}
            </span>
          ))}
        </div>
      ) : null}

      {nodeType === "condition" ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" className="!left-6 !bg-emerald-500" />
          <Handle type="source" position={Position.Bottom} id="false" className="!left-auto !right-6 !bg-rose-500" />
        </>
      ) : nodeType === "random_split" ? (
        <>
          <Handle type="source" position={Position.Bottom} id="a" className="!left-6 !bg-indigo-500" />
          <Handle type="source" position={Position.Bottom} id="b" className="!left-auto !right-6 !bg-indigo-300" />
        </>
      ) : buttons.length > 0 ? (
        <>
          {buttons.map((b, i) => (
            <Handle
              key={b.id}
              type="source"
              position={Position.Bottom}
              id={b.id}
              style={{ left: `${((i + 1) / (buttons.length + 1)) * 100}%` }}
              className="!bg-blue-500"
            />
          ))}
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
  random_split: AutomationNode,
  delay: AutomationNode,
  add_tag: AutomationNode,
  remove_tag: AutomationNode,
  ai_reply: AutomationNode,
  ask_question: AutomationNode,
  reply_comment: AutomationNode,
  human_handoff: AutomationNode,
  start_automation: AutomationNode,
};

export { NODE_META };
