import Link from "next/link";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { listAutomations } from "@/lib/data/automations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Workflow, Plus } from "lucide-react";

const STATUS_VARIANT = {
  active: "success",
  paused: "secondary",
  draft: "outline",
} as const;

const STATUS_LABEL = { active: "Ativa", paused: "Pausada", draft: "Rascunho" };

const TRIGGER_LABEL = {
  dm_keyword: "Palavra-chave em DM",
  comment_keyword: "Palavra-chave em comentário",
  new_contact: "Novo contato",
  story_reply: "Resposta a story",
  manual: "Manual",
};

export default async function AutomationsPage() {
  const organization = await getCurrentOrganization();
  const automations = await listAutomations(organization!.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Automações</h1>
          <p className="text-sm text-muted-foreground">Fluxos de resposta automática para DMs e comentários.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/automations/new">
            <Plus className="h-4 w-4" />
            Nova automação
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {automations.map((automation) => (
          <Link key={automation.id} href={`/dashboard/automations/${automation.id}`}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{automation.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{TRIGGER_LABEL[automation.trigger_type]}</p>
                </div>
                <Badge variant={STATUS_VARIANT[automation.status]}>{STATUS_LABEL[automation.status]}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {automation.flow_definition.nodes.length} nós · {automation.flow_definition.edges.length} conexões
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}

        {automations.length === 0 && (
          <Card className="border-dashed sm:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Workflow className="h-8 w-8" />
              Nenhuma automação criada ainda.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
