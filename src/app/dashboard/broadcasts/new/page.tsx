import { getCurrentOrganization } from "@/lib/data/organizations";
import { listInstagramAccountOptions } from "@/lib/data/automations";
import { listTags } from "@/lib/data/contacts-list";
import { listSegments } from "@/lib/data/segments";
import { NewBroadcastForm } from "@/components/broadcasts/new-broadcast-form";

export default async function NewBroadcastPage() {
  const organization = await getCurrentOrganization();
  const [accounts, tags, segments] = await Promise.all([
    listInstagramAccountOptions(organization!.id),
    listTags(organization!.id),
    listSegments(organization!.id),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova mensagem em massa</h1>
        <p className="text-sm text-muted-foreground">
          Escreva a mensagem e escolha o público. Nada é enviado ainda — na próxima tela você revisa e confirma o envio.
        </p>
      </div>
      <NewBroadcastForm
        organizationId={organization!.id}
        accounts={accounts}
        tags={tags}
        segments={segments}
      />
    </div>
  );
}
