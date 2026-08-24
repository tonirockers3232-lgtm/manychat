import { getCurrentOrganization } from "@/lib/data/organizations";
import { listContactsWithRelations } from "@/lib/data/segments";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ContactStatusSelect } from "@/components/contacts/contact-status-select";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function ContactsPage() {
  const organization = await getCurrentOrganization();
  const contacts = await listContactsWithRelations(organization!.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contatos</h1>
        <p className="text-sm text-muted-foreground">Pessoas que já interagiram com suas contas do Instagram.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {contacts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Users className="h-8 w-8" />
              Nenhum contato ainda.
            </div>
          )}
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
              <Avatar>
                <AvatarImage src={contact.profile_pic_url ?? undefined} />
                <AvatarFallback>{(contact.username ?? "??").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">@{contact.username ?? "desconhecido"}</p>
                <p className="text-xs text-muted-foreground">
                  Última interação{" "}
                  {formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true, locale: ptBR })}
                  {(contact.phone || contact.email) && " · "}
                  {[contact.phone, contact.email].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {contact.tagNames.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))}
              </div>
              <ContactStatusSelect contactId={contact.id} status={contact.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
