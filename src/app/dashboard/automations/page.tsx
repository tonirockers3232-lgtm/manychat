import Link from "next/link";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { listAutomations } from "@/lib/data/automations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Workflow, Plus, MessageCircle, AtSign, UserPlus, Repeat2, Sparkles, Rocket } from "lucide-react";

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
  story_reply: "Resposta a Story",
  story_mention: "Menção em Story",
  manual: "Início manual (sequência)",
};

const TRIGGER_ICON = {
  dm_keyword: MessageCircle,
  comment_keyword: AtSign,
  new_contact: UserPlus,
  story_reply: Repeat2,
  story_mention: Sparkles,
  manual: Rocket,
};

const TRIGGER_CHIP = {
  dm_keyword: "bg-violet-100 text-violet-600",
  comment_keyword: "bg-blue-100 text-blue-600",
  new_contact: "bg-emerald-100 text-emerald-600",
  story_reply: "bg-pink-100 text-pink-600",
  story_mention: "bg-amber-100 text-amber-600",
  manual: "bg-cyan-100 text-cyan-600",
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
        {automations.map((automation) => {
          const TriggerIcon = TRIGGER_ICON[automation.trigger_type];
          return (
            <Link key={automation.id} href={`/dashboard/automations/${automation.id}`}>
              <Card className="h-full">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TRIGGER_CHIP[automation.trigger_type]}`}
                    >
                      <TriggerIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <CardTitle className="text-base">{automation.name}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">{TRIGGER_LABEL[automation.trigger_type]}</p>
                    </div>
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
          );
        })}

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
