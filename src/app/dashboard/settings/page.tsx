import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { listCustomFields } from "@/lib/data/custom-fields";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default async function SettingsPage() {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();

  const [{ data: aiSettings }, customFields] = await Promise.all([
    supabase.from("ai_settings").select("*").eq("organization_id", organization!.id).eq("is_default", true).maybeSingle(),
    listCustomFields(organization!.id),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <SettingsTabs organization={organization!} aiSettings={aiSettings} customFields={customFields} />
    </div>
  );
}
