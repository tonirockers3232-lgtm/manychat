import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { listAuditLogs } from "@/lib/data/audit-logs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { format } from "date-fns";
import type { AuditAction, AuditEntityType } from "@/types/database";

const ACTION_LABEL: Record<AuditAction, string> = {
  created: "criou",
  updated: "editou",
  status_changed: "mudou o status de",
  deleted: "excluiu",
};

const ACTION_VARIANT: Record<AuditAction, "success" | "secondary" | "destructive" | "outline"> = {
  created: "success",
  updated: "secondary",
  status_changed: "outline",
  deleted: "destructive",
};

const ENTITY_LABEL: Record<AuditEntityType, string> = {
  automation: "automação",
  custom_field: "campo personalizado",
  segment: "segmento",
};

export default async function AuditLogsPage() {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const [logs, { data: auth }] = await Promise.all([listAuditLogs(organization!.id), supabase.auth.getUser()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Quem criou, editou ou excluiu automações, campos personalizados e segmentos.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <History className="h-8 w-8" />
              Nenhuma ação registrada ainda.
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-0">
              <div className="min-w-0">
                <p className="font-medium">
                  {log.user_id === auth.user?.id ? "Você" : "Um membro da organização"}{" "}
                  <span className="text-muted-foreground">
                    {ACTION_LABEL[log.action]} {ENTITY_LABEL[log.entity_type]}
                  </span>{" "}
                  {log.entity_name ?? "(sem nome)"}
                </p>
                {log.action === "status_changed" && typeof log.detail?.status === "string" && (
                  <p className="text-xs text-muted-foreground">Novo status: {log.detail.status}</p>
                )}
                {log.action === "deleted" && (
                  <p className="text-xs text-muted-foreground">Registro excluído — não pode mais ser aberto.</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge variant={ACTION_VARIANT[log.action]}>{ACTION_LABEL[log.action]}</Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd/MM HH:mm")}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
