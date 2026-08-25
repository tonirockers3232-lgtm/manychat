import type { FlowDefinition } from "@/types/automation";
import type { AutomationTriggerType } from "@/types/database";

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  triggerType: AutomationTriggerType;
  flow: FlowDefinition;
}

// Modelos prontos, montados só com nós/recursos já testados de ponta a ponta
// nesta sessão (envio de mensagem, pergunta com captura de resposta, condição,
// tag, atendimento humano, botões) — nenhum comportamento novo, só um ponto de
// partida pra não montar tudo do zero. Sempre criados como "draft": o usuário
// revisa/ajusta palavras-chave e textos antes de ativar.
export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "send-material",
    name: "Enviar material gratuito",
    description: "Contato manda uma palavra-chave e recebe um link (e-book, PDF, aula) na hora.",
    triggerType: "dm_keyword",
    flow: {
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 0 }, data: { triggerType: "dm_keyword", keywords: ["material"], matchType: "contains" } },
        {
          id: "send-1",
          type: "send_message",
          position: { x: 250, y: 130 },
          data: { messageType: "text", text: "Aqui está o seu material! 🎁\n\nCOLE_O_LINK_AQUI" },
        },
      ],
      edges: [{ id: "e-trigger-send", source: "trigger-1", target: "send-1" }],
    },
  },
  {
    id: "lead-qualification",
    name: "Qualificação de lead",
    description: "Pergunta o nível/interesse do contato, marca com tag e encaminha os mais quentes para atendimento humano.",
    triggerType: "dm_keyword",
    flow: {
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 0 }, data: { triggerType: "dm_keyword", keywords: ["aula"], matchType: "contains" } },
        {
          id: "ask-1",
          type: "ask_question",
          position: { x: 250, y: 130 },
          data: {
            question: "Qual seu nível hoje?",
            saveTo: "nivel",
            inputType: "choice",
            choices: ["Iniciante", "Intermediário", "Avançado"],
          },
        },
        {
          id: "cond-1",
          type: "condition",
          position: { x: 250, y: 280 },
          data: { field: "custom_field", operator: "equals", value: "Avançado", customFieldKey: "nivel" },
        },
        { id: "tag-1", type: "add_tag", position: { x: 60, y: 420 }, data: { tagName: "lead-quente" } },
        { id: "handoff-1", type: "human_handoff", position: { x: 60, y: 550 }, data: {} },
        {
          id: "send-1",
          type: "send_message",
          position: { x: 440, y: 420 },
          data: { messageType: "text", text: "Show! Em breve te mandamos mais detalhes por aqui. 🙌" },
        },
      ],
      edges: [
        { id: "e-trigger-ask", source: "trigger-1", target: "ask-1" },
        { id: "e-ask-cond", source: "ask-1", target: "cond-1" },
        { id: "e-cond-tag", source: "cond-1", sourceHandle: "true", target: "tag-1" },
        { id: "e-tag-handoff", source: "tag-1", target: "handoff-1" },
        { id: "e-cond-send", source: "cond-1", sourceHandle: "false", target: "send-1" },
      ],
    },
  },
  {
    id: "menu-buttons",
    name: "Menu com botões",
    description: "Mostra duas opções como botões reais e responde de forma diferente para cada uma.",
    triggerType: "dm_keyword",
    flow: {
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 0 }, data: { triggerType: "dm_keyword", keywords: ["menu"], matchType: "contains" } },
        {
          id: "send-menu",
          type: "send_message",
          position: { x: 250, y: 130 },
          data: {
            messageType: "text",
            text: "Oi! No que posso te ajudar?",
            quickReplies: [
              { id: "opt-aulas", label: "Aulas" },
              { id: "opt-precos", label: "Preços" },
            ],
          },
        },
        { id: "send-aulas", type: "send_message", position: { x: 80, y: 280 }, data: { messageType: "text", text: "Nossas aulas acontecem..." } },
        { id: "send-precos", type: "send_message", position: { x: 420, y: 280 }, data: { messageType: "text", text: "Nossos valores são..." } },
      ],
      edges: [
        { id: "e-trigger-menu", source: "trigger-1", target: "send-menu" },
        { id: "e-menu-aulas", source: "send-menu", sourceHandle: "opt-aulas", target: "send-aulas" },
        { id: "e-menu-precos", source: "send-menu", sourceHandle: "opt-precos", target: "send-precos" },
      ],
    },
  },
];

export function getAutomationTemplate(id: string): AutomationTemplate | undefined {
  return AUTOMATION_TEMPLATES.find((t) => t.id === id);
}
