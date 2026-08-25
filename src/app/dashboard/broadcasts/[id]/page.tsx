import { notFound } from "next/navigation";
import Link from "next/link";
import { getBroadcastWithRecipients } from "@/lib/data/broadcasts";
import { resolveBroadcastAudience, isWithinMessagingWindow } from "@/lib/data/broadcast-audience";
import { listTags } from "@/lib/data/contacts-list";
import { listSegments } from "@/lib/data/segments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SendBroadcastButton } from "@/components/broadcasts/send-broadcast-button";

const RECIPIENT_STATUS_LABEL = {
  pending: "Na fila",
  processing: "Na fila",
  sent: "Enviada",
  skipped_window: "Fora da janela de 24h",
  failed: "Falhou",
} as const;
const RECIPIENT_STATUS_VARIANT = {
  pending: "outline",
  processing: "outline",
  sent: "success",
  skipped_window: "secondary",
  failed: "destructive",
} as const;

export default async function BroadcastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getBroadcastWithRecipients(id);
  if (!result) notFound();
  const { broadcast, recipients } = result;

  let audiencePreview: { total: number; withinWindow: number } | null = null;
  if (broadcast.status === "draft") {
    const audience = await resolveBroadcastAudience({
      organizationId: broadcast.organization_id,
      instagramAccountId: broadcast.instagram_account_id,
      audienceType: broadcast.audience_type,
      audienceRef: broadcast.audience_ref,
    });
    audiencePreview = {
      total: audience.length,
      withinWindow: audience.filter((c) => isWithinMessagingWindow(c.last_inbound_message_at)).length,
    };
  }

  let audienceLabel = "Todos os contatos";
  if (broadcast.audience_type === "tag" && broadcast.audience_ref) {
    const tags = await listTags(broadcast.organization_id);
    audienceLabel = tags.find((t) => t.id === broadcast.audience_ref)?.name ?? "Tag removida";
  } else if (broadcast.audience_type === "segment" && broadcast.audience_ref) {
    const segments = await listSegments(broadcast.organization_id);
    audienceLabel = segments.find((s) => s.id === broadcast.audience_ref)?.name ?? "Segmento removido";
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/dashboard/broadcasts" className="text-sm text-muted-foreground hover:underline">
          ← Mensagem em massa
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{broadcast.name}</h1>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6 text-sm">
          <div>
            <p className="text-muted-foreground">Público</p>
            <p className="font-medium">{audienceLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Mensagem</p>
            <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3">{broadcast.message_text}</p>
          </div>
        </CardContent>
      </Card>

      {broadcast.status === "draft" && audiencePreview && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="text-sm">
              <p>
                <strong>{audiencePreview.total}</strong> contato(s) no público escolhido.
              </p>
              <p className="mt-1 text-muted-foreground">
                <strong className="text-foreground">{audiencePreview.withinWindow}</strong> estão dentro da janela de
                24h da Meta agora — só esses vão receber. Os outros{" "}
                {audiencePreview.total - audiencePreview.withinWindow > 0 &&
                  `(${audiencePreview.total - audiencePreview.withinWindow})`}{" "}
                ficam registrados como "fora da janela", sem tentativa de envio.
              </p>
            </div>
            <SendBroadcastButton broadcastId={broadcast.id} />
          </CardContent>
        </Card>
      )}

      {broadcast.status !== "draft" && (
        <Card>
          <CardContent className="p-0">
            {recipients.map((r) => {
              const contact = r.contacts;
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-0">
                  <span>{contact?.name || contact?.username || "Contato"}</span>
                  <div className="flex items-center gap-2">
                    {r.detail && <span className="text-xs text-muted-foreground">{r.detail}</span>}
                    <Badge variant={RECIPIENT_STATUS_VARIANT[r.status]}>{RECIPIENT_STATUS_LABEL[r.status]}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
