import Link from "next/link";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { listAutomations } from "@/lib/data/automations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeyRound } from "lucide-react";

const STATUS_VARIANT = { active: "success", paused: "secondary", draft: "outline" } as const;
const STATUS_LABEL = { active: "Ativa", paused: "Pausada", draft: "Rascunho" } as const;

export default async function KeywordsPage() {
  const organization = await getCurrentOrganization();
  const automations = await listAutomations(organization!.id);

  const dmKeywordAutomations = automations.filter((a) => a.trigger_type === "dm_keyword");
  const commentKeywordAutomations = automations.filter((a) => a.trigger_type === "comment_keyword");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Palavras-chave</h1>
        <p className="text-sm text-muted-foreground">Todas as palavras-chave que disparam automações, em um só lugar.</p>
      </div>

      <KeywordGroup title="Em DM" automations={dmKeywordAutomations} />
      <KeywordGroup title="Em comentário" automations={commentKeywordAutomations} />
    </div>
  );
}

function KeywordGroup({ title, automations }: { title: string; automations: Awaited<ReturnType<typeof listAutomations>> }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <Card>
        <CardContent className="p-0">
          {automations.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <KeyRound className="h-6 w-6" />
              Nenhuma automação com esse gatilho ainda.
            </div>
          )}
          {automations.map((automation) => {
            const keywords: string[] = automation.trigger_config?.keywords ?? [];
            return (
              <Link
                key={automation.id}
                href={`/dashboard/automations/${automation.id}`}
                className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{automation.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {keywords.length === 0 && <span className="text-xs text-muted-foreground">Sem palavra-chave definida</span>}
                    {keywords.map((k) => (
                      <Badge key={k} variant="outline">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[automation.status]}>{STATUS_LABEL[automation.status]}</Badge>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
