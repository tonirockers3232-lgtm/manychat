// Esquema do fluxo visual de automação, serializado em `automations.flow_definition`.
// O editor visual (React Flow) lê/escreve exatamente este formato.

export type FlowNodeType =
  | "trigger"
  | "send_message"
  | "condition"
  | "random_split"
  | "delay"
  | "add_tag"
  | "remove_tag"
  | "ai_reply"
  | "ask_question"
  | "reply_comment"
  | "human_handoff";

export interface FlowNodeBase {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
}

export interface TriggerNodeData {
  triggerType: "dm_keyword" | "comment_keyword" | "new_contact" | "story_reply" | "story_mention" | "manual";
  keywords?: string[];
  matchType?: "exact" | "contains";
}

export interface SendMessageNodeData {
  messageType: "text" | "image" | "quick_reply";
  text?: string;
  mediaUrl?: string;
  quickReplies?: Array<{ label: string; nextNodeId?: string }>;
}

export interface ConditionNodeData {
  field: "has_tag" | "message_contains" | "is_follower" | "custom_field";
  operator: "equals" | "contains" | "not_equals";
  value: string;
  customFieldKey?: string; // obrigatório quando field === "custom_field"
  // Aresta com sourceHandle "true" segue por aqui, "false" pelo outro ramo.
}

// Aresta com sourceHandle "a" segue com probabilidade `splitPercent`% dos
// runs, "b" com o restante — sorteado a cada execução (Math.random()).
export interface RandomSplitNodeData {
  splitPercent: number; // 0-100, chance de seguir pelo ramo A
}

export interface DelayNodeData {
  amount: number;
  unit: "seconds" | "minutes" | "hours";
}

export interface TagNodeData {
  tagName: string;
}

export interface AiReplyNodeData {
  aiSettingsId: string | null;
  fallbackText?: string;
}

// saveTo: "phone" | "email" | "name" mapeiam para colunas nativas de contacts;
// qualquer outro valor é a `key` de um custom_field da organização.
export interface AskQuestionNodeData {
  question: string;
  saveTo: string;
  inputType: "text" | "number" | "email" | "phone" | "choice";
  choices?: string[]; // só relevante quando inputType === "choice"
}

// Só produz efeito quando o run foi disparado por um comentário
// (ctx.incomingCommentId) — ver executeReplyComment.
export interface ReplyCommentNodeData {
  text: string;
}

export type HumanHandoffNodeData = Record<string, never>;

export type FlowNodeData =
  | TriggerNodeData
  | SendMessageNodeData
  | ConditionNodeData
  | RandomSplitNodeData
  | DelayNodeData
  | TagNodeData
  | AiReplyNodeData
  | AskQuestionNodeData
  | ReplyCommentNodeData
  | HumanHandoffNodeData;

export interface FlowNode extends FlowNodeBase {
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
