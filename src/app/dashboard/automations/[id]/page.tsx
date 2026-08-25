import { notFound } from "next/navigation";
import { getAutomation, listAutomations } from "@/lib/data/automations";
import { listCustomFields } from "@/lib/data/custom-fields";
import { FlowEditor } from "@/components/automations/flow-editor";

export default async function AutomationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const automation = await getAutomation(id);
  if (!automation) notFound();

  const [customFields, automations] = await Promise.all([
    listCustomFields(automation.organization_id),
    listAutomations(automation.organization_id),
  ]);
  const otherAutomations = automations.filter((a) => a.id !== automation.id).map((a) => ({ id: a.id, name: a.name }));

  return <FlowEditor automation={automation} customFields={customFields} otherAutomations={otherAutomations} />;
}
