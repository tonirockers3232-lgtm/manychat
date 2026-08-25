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
  | "human_handoff"
  | "start_automation";

export interface FlowNodeBase {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
}

// mediaId (só relevante em comment_keyword) restringe o gatilho a um post/reel
// específico — sem ele, dispara em comentários de qualquer publicação (era o
// único comportamento antes desse campo existir). Os outros campos `media*`
// são só um retrato pra mostrar no painel; o motor sempre casa pelo mediaId.
export interface TriggerNodeData {
  triggerType: "dm_keyword" | "comment_keyword" | "new_contact" | "story_reply" | "story_mention" | "manual";
  keywords?: string[];
  matchType?: "exact" | "contains";
  mediaId?: string;
  mediaThumbnail?: string;
  mediaCaption?: string;
  mediaPermalink?: string;
}

// Botões reais (Instagram quick replies), só em DM. Cada botão vira uma
// aresta própria no editor (sourceHandle = button.id) — tocar no botão retoma
// o run pelo ramo daquele id, igual ao esquema de "true"/"false" da Condição.
export interface SendMessageNodeData {
  messageType: "text" | "image" | "quick_reply";
  text?: string;
  mediaUrl?: string;
  quickReplies?: Array<{ id: string; label: string }>;
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
  unit: "seconds" | "minutes" | "hours" | "days";
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

// Inicia o run de OUTRA automação para o mesmo contato, em paralelo — o fluxo
// atual continua normalmente a partir daqui. É o bloco genérico por trás de
// "Sequências" (uma automação com gatilho "manual" que só encadeia
// mensagem→aguardar→mensagem) e de "encaminhar para outra automação": os dois
// casos do ManyChat são o mesmo primitivo, sem precisar de um objeto novo.
// `targetAutomationName` é só um retrato pra exibir no card do nó — o motor
// sempre resolve a automação de novo pelo id na hora de rodar.
export interface StartAutomationNodeData {
  targetAutomationId: string;
  targetAutomationName?: string;
}

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
  | HumanHandoffNodeData
  | StartAutomationNodeData;

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
