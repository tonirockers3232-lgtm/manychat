import { notFound } from "next/navigation";
import { getAutomation } from "@/lib/data/automations";
import { listCustomFields } from "@/lib/data/custom-fields";
import { FlowEditor } from "@/components/automations/flow-editor";

export default async function AutomationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const automation = await getAutomation(id);
  if (!automation) notFound();

  const customFields = await listCustomFields(automation.organization_id);

  return <FlowEditor automation={automation} customFields={customFields} />;
}
