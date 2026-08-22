"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// RLS garante que só um membro da organização dona da conta consegue
// desconectá-la — não há checagem manual de organization_id aqui.
export async function disconnectInstagramAccount(accountId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("instagram_accounts")
    .update({ status: "disconnected" })
    .eq("id", accountId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/instagram");
}
