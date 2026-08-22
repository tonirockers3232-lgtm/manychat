// Esquema do fluxo visual de automação, serializado em `automations.flow_definition`.
// O editor visual (React Flow) lê/escreve exatamente este formato.

export type FlowNodeType =
  | "trigger"
  | "send_message"
  | "condition"
  | "delay"
  | "add_tag"
  | "remove_tag"
  | "ai_reply";

export interface FlowNodeBase {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
}

export interface TriggerNodeData {
  triggerType: "dm_keyword" | "comment_keyword" | "new_contact" | "story_reply" | "manual";
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
  field: "has_tag" | "message_contains" | "is_follower";
  operator: "equals" | "contains" | "not_equals";
  value: string;
  // Aresta com sourceHandle "true" segue por aqui, "false" pelo outro ramo.
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

export type FlowNodeData =
  | TriggerNodeData
  | SendMessageNodeData
  | ConditionNodeData
  | DelayNodeData
  | TagNodeData
  | AiReplyNodeData;

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
