import { getCurrentOrganization } from "@/lib/data/organizations";
import { getAnalyticsSummary } from "@/lib/data/analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatTile } from "@/components/analytics/stat-tile";
import { StatusFunnelChart } from "@/components/analytics/status-funnel-chart";
import { AutomationRanking } from "@/components/analytics/automation-ranking";
import { MessagesLineChart } from "@/components/analytics/messages-line-chart";

export default async function AnalyticsPage() {
  const organization = await getCurrentOrganization();
  const summary = await getAnalyticsSummary(organization!.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Como as automações estão performando nos últimos 30 dias.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Contatos" value={summary.totalContacts.toLocaleString("pt-BR")} />
        <StatTile label="Novos contatos (30d)" value={summary.newContactsLast30d.toLocaleString("pt-BR")} />
        <StatTile label="Mensagens enviadas (30d)" value={summary.outboundMessagesLast30d.toLocaleString("pt-BR")} />
        <StatTile label="Taxa de conversão" value={`${(summary.conversionRate * 100).toFixed(0)}%`} />
        <StatTile label="Atendimentos humanos" value={summary.handoffCount.toLocaleString("pt-BR")} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mensagens por dia</CardTitle>
          <CardDescription>Últimos 14 dias, recebidas vs. enviadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <MessagesLineChart data={summary.messagesByDay} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Funil de status</CardTitle>
            <CardDescription>
              Contatos por etapa de qualificação
              {summary.lostCount > 0 && ` · ${summary.lostCount} perdidos (fora do funil)`}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusFunnelChart data={summary.statusFunnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automações mais executadas</CardTitle>
            <CardDescription>Por número de execuções (todo o período).</CardDescription>
          </CardHeader>
          <CardContent>
            <AutomationRanking automations={summary.automationRanking} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
