import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";

const STATUS_VARIANT = { success: "success", error: "destructive", skipped: "secondary" } as const;

export default async function LogsPage() {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("automation_logs")
    .select("*, automation_runs(automations(name))")
    .eq("organization_id", organization!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Logs de automação</h1>
        <p className="text-sm text-muted-foreground">Histórico de execução dos nós de cada fluxo.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {(logs ?? []).length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <ScrollText className="h-8 w-8" />
              Nenhum log registrado ainda.
            </div>
          )}
          {(logs ?? []).map((log) => {
            const automationName = (log.automation_runs as unknown as { automations: { name: string } } | null)?.automations?.name;
            return (
              <div key={log.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-0">
                <div className="min-w-0">
                  <p className="font-medium">
                    {automationName ?? "Automação removida"} <span className="text-muted-foreground">· {log.node_type}</span>
                  </p>
                  {log.status === "error" && (
                    <p className="truncate text-xs text-destructive">{String(log.detail?.reason ?? "")}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={STATUS_VARIANT[log.status as keyof typeof STATUS_VARIANT]}>{log.status}</Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd/MM HH:mm")}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
