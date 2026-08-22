import { notFound } from "next/navigation";
import { getAutomation } from "@/lib/data/automations";
import { FlowEditor } from "@/components/automations/flow-editor";

export default async function AutomationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const automation = await getAutomation(id);
  if (!automation) notFound();

  return <FlowEditor automation={automation} />;
}
