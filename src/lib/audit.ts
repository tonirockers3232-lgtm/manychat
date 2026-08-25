import { createClient } from "@/lib/supabase/server";
import type { AuditAction, AuditEntityType } from "@/types/database";

// Registra uma ação administrativa (criar/editar/mudar status/excluir
// automação, campo personalizado ou segmento) na trilha de auditoria.
// Chamado a partir de Server Actions só — usa o cliente com sessão do
// usuário (não o admin), então `user_id` vem do próprio `auth.uid()` do
// insert e a RLS de `audit_logs_insert` já garante que só é possível logar
// para a própria organização.
export async function logAudit(params: {
  organizationId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  entityName: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("audit_logs").insert({
    organization_id: params.organizationId,
    user_id: user?.id ?? null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    entity_name: params.entityName,
    detail: params.detail ?? {},
  });
}
