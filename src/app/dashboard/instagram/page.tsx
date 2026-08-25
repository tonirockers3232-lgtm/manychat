import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Instagram } from "lucide-react";
import { DisconnectAccountButton } from "@/components/instagram/disconnect-account-button";

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "destructive" | "secondary" }> = {
  connected: { label: "Conectado", variant: "success" },
  disconnected: { label: "Desconectado", variant: "secondary" },
  error: { label: "Erro", variant: "destructive" },
  token_expired: { label: "Token expirado", variant: "destructive" },
};

export default async function InstagramAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const organization = await getCurrentOrganization();
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("organization_id", organization!.id)
    .order("connected_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contas do Instagram</h1>
          <p className="text-sm text-muted-foreground">Conecte contas comerciais para automatizar DMs e comentários.</p>
        </div>
        <Button asChild>
          <a href={`/api/oauth/connect?org=${organization!.id}`}>
            <Instagram className="h-4 w-4" />
            Conectar Instagram
          </a>
        </Button>
      </div>

      {connected && (
        <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">Conta conectada com sucesso.</p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          Não foi possível conectar: {decodeURIComponent(error)}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(accounts ?? []).map((account) => {
          const status = STATUS_LABEL[account.status] ?? STATUS_LABEL.disconnected;
          return (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={account.profile_pic_url ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-amber-400 font-semibold text-white">
                    {(account.username ?? "IG").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-sm">@{account.username ?? "sem_usuario"}</CardTitle>
                  <CardDescription className="truncate">{account.name}</CardDescription>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </CardHeader>
              <CardContent>
                <DisconnectAccountButton accountId={account.id} />
              </CardContent>
            </Card>
          );
        })}

        {(accounts ?? []).length === 0 && (
          <Card className="border-dashed sm:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Instagram className="h-8 w-8" />
              Nenhuma conta conectada ainda.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
