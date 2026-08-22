import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, Inbox, Workflow, Users } from "lucide-react";

export default async function DashboardHomePage() {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();

  const [{ count: accountsCount }, { count: openConversations }, { count: activeAutomations }, { count: contactsCount }] =
    await Promise.all([
      supabase
        .from("instagram_accounts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization!.id)
        .eq("status", "connected"),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization!.id)
        .eq("status", "open"),
      supabase
        .from("automations")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization!.id)
        .eq("status", "active"),
      supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization!.id),
    ]);

  const stats = [
    { label: "Contas conectadas", value: accountsCount ?? 0, icon: Instagram, href: "/dashboard/instagram" },
    { label: "Conversas abertas", value: openConversations ?? 0, icon: Inbox, href: "/dashboard/inbox" },
    { label: "Automações ativas", value: activeAutomations ?? 0, icon: Workflow, href: "/dashboard/automations" },
    { label: "Contatos", value: contactsCount ?? 0, icon: Users, href: "/dashboard/contacts" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Visão geral</h1>
        <Button asChild>
          <Link href="/dashboard/automations/new">Nova automação</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {(accountsCount ?? 0) === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Instagram className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Conecte sua primeira conta do Instagram</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Você precisa conectar uma conta comercial do Instagram para começar a automatizar
              DMs e comentários.
            </p>
            <Button asChild>
              <Link href="/dashboard/instagram">Conectar Instagram</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
