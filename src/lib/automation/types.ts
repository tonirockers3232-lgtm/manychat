import type { AutomationRun } from "@/types/database";

// Contexto de execução compartilhado por todos os nós de um run.
export interface RunContext {
  organizationId: string;
  instagramAccountId: string;
  igBusinessId: string; // instagram_business_id da conta conectada
  accessToken: string; // já descriptografado
  contactId: string;
  igsid: string; // Instagram-scoped ID do contato
  conversationId: string | null;
  incomingText?: string; // texto da DM ou comentário que disparou o fluxo
  incomingCommentId?: string; // presente quando o gatilho foi um comentário
}

export type NodeExecutionResult =
  | { action: "continue"; branch?: "true" | "false"; skipped?: string }
  | { action: "wait"; nextNodeId: string; runAt: string }
  | { action: "stop"; reason: string };

export type RunLike = Pick<AutomationRun, "id" | "context">;
