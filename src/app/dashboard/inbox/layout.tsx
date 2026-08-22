import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { listConversations } from "@/lib/data/conversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function InboxLayout({ children }: { children: ReactNode }) {
  const organization = await getCurrentOrganization();
  const conversations = await listConversations(organization!.id);

  return (
    <div className="flex h-[calc(100vh-3.5rem-3rem)] gap-4">
      <aside className="w-80 shrink-0 overflow-y-auto rounded-lg border bg-background">
        {conversations.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
        )}
        {conversations.map((conv) => {
          const contact = conv.contacts as unknown as { username: string | null; name: string | null; profile_pic_url: string | null } | null;
          return (
            <Link
              key={conv.id}
              href={`/dashboard/inbox/${conv.id}`}
              className="flex items-center gap-3 border-b px-4 py-3 hover:bg-muted/50"
            >
              <Avatar>
                <AvatarImage src={contact?.profile_pic_url ?? undefined} />
                <AvatarFallback>{(contact?.username ?? "??").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">@{contact?.username ?? "desconhecido"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </Link>
          );
        })}
      </aside>
      <section className="flex-1 overflow-hidden rounded-lg border bg-background">{children}</section>
    </div>
  );
}
