import { notFound } from "next/navigation";
import { getAutomation, listAutomations } from "@/lib/data/automations";
import { listCustomFields } from "@/lib/data/custom-fields";
import { listContactsForAccount } from "@/lib/data/contacts-list";
import { FlowEditor } from "@/components/automations/flow-editor";

export default async function AutomationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const automation = await getAutomation(id);
  if (!automation) notFound();

  const [customFields, automations, testContacts] = await Promise.all([
    listCustomFields(automation.organization_id),
    listAutomations(automation.organization_id),
    automation.instagram_account_id ? listContactsForAccount(automation.instagram_account_id) : Promise.resolve([]),
  ]);
  const otherAutomations = automations.filter((a) => a.id !== automation.id).map((a) => ({ id: a.id, name: a.name }));

  return (
    <FlowEditor
      automation={automation}
      customFields={customFields}
      otherAutomations={otherAutomations}
      testContacts={testContacts}
    />
  );
}
