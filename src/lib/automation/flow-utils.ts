import type { FlowDefinition, TriggerNodeData } from "@/types/automation";

// O motor de automação (`findMatchingAutomation`) lê `automations.trigger_config`,
// não o nó de gatilho dentro de `flow_definition` — as duas precisam ficar em
// sincronia sempre que o fluxo é salvo (seja pelo editor visual ou ao criar
// uma automação a partir de um modelo pronto), senão o gatilho fica
// configurado só visualmente e nunca dispara de verdade. Ver bug original:
// `updateAutomationFlow` esquecia essa sincronização e automações com
// keywords no editor nunca rodavam.
export function deriveTriggerConfig(flow: FlowDefinition): Record<string, unknown> {
  const triggerNode = flow.nodes.find((n) => n.type === "trigger");
  if (!triggerNode) return {};
  const data = triggerNode.data as TriggerNodeData;
  return {
    keywords: data.keywords ?? [],
    match_type: data.matchType ?? "contains",
    // Só relevante pra comment_keyword — restringe o gatilho a um post/reel
    // específico. Omitido (undefined) quando nenhum foi escolhido, mantendo
    // o comportamento antigo de "qualquer post" sem precisar de migração.
    ...(data.mediaId ? { media_id: data.mediaId } : {}),
  };
}
