import Link from "next/link";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { listBroadcasts } from "@/lib/data/broadcasts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";

const STATUS_VARIANT = { draft: "outline", sending: "secondary", completed: "success" } as const;
const STATUS_LABEL = { draft: "Rascunho", sending: "Enviando", completed: "Concluído" } as const;
const AUDIENCE_LABEL = { all: "Todos os contatos", tag: "Tag", segment: "Segmento" } as const;

export default async function BroadcastsPage() {
  const organization = await getCurrentOrganization();
  const broadcasts = await listBroadcasts(organization!.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mensagem em massa</h1>
          <p className="text-sm text-muted-foreground">
            Manda uma DM pra um segmento, uma tag ou todos os contatos. A Meta só entrega pra quem te escreveu nas
            últimas 24h — o resto fica registrado como "fora da janela", nunca é tentado.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/broadcasts/new">Nova mensagem</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {broadcasts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Megaphone className="h-6 w-6" />
              Nenhuma mensagem em massa criada ainda.
            </div>
          )}
          {broadcasts.map((b) => (
            <Link
              key={b.id}
              href={`/dashboard/broadcasts/${b.id}`}
              className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{b.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {AUDIENCE_LABEL[b.audience_type]}
                  {b.status !== "draft" && (
                    <>
                      {" · "}
                      {b.counts.sent} enviadas · {b.counts.skipped_window} fora da janela
                      {b.counts.failed > 0 && ` · ${b.counts.failed} falharam`}
                    </>
                  )}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
