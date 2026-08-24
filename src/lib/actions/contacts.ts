"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ContactStatus } from "@/types/database";

export async function updateContactStatus(contactId: string, status: ContactStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").update({ status }).eq("id", contactId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard/segments");
}
