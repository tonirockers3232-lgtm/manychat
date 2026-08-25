import { getCurrentOrganization } from "@/lib/data/organizations";
import { listContactsWithRelations, listSegments } from "@/lib/data/segments";
import { listTags } from "@/lib/data/contacts-list";
import { ContactsList } from "@/components/contacts/contacts-list";

export default async function ContactsPage() {
  const organization = await getCurrentOrganization();
  const [contacts, segments, tags] = await Promise.all([
    listContactsWithRelations(organization!.id),
    listSegments(organization!.id),
    listTags(organization!.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contatos</h1>
        <p className="text-sm text-muted-foreground">Pessoas que já interagiram com suas contas do Instagram.</p>
      </div>

      <ContactsList contacts={contacts} segments={segments} tagNames={tags.map((t) => t.name)} />
    </div>
  );
}
