import { getCurrentOrganization } from "@/lib/data/organizations";
import { listInstagramAccountOptions } from "@/lib/data/automations";
import { NewAutomationForm } from "@/components/automations/new-automation-form";

export default async function NewAutomationPage() {
  const organization = await getCurrentOrganization();
  const accounts = await listInstagramAccountOptions(organization!.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova automação</h1>
        <p className="text-sm text-muted-foreground">Escolha o gatilho que vai disparar o fluxo.</p>
      </div>
      <NewAutomationForm accounts={accounts} />
    </div>
  );
}
