"use server";

import { createClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { listRecentMedia, type InstagramMedia } from "@/lib/meta/instagram-api";

// RLS (`is_org_member`) garante que só um membro da organização dona da conta
// consegue selecionar essa linha — inclusive a coluna `access_token`, que só
// sai daqui já descriptografada para uma chamada de servidor, nunca pro cliente.
export async function listAccountMedia(instagramAccountId: string): Promise<InstagramMedia[]> {
  const supabase = await createClient();
  const { data: account, error } = await supabase
    .from("instagram_accounts")
    .select("access_token")
    .eq("id", instagramAccountId)
    .single();
  if (error || !account) throw new Error("Conta do Instagram não encontrada");

  return listRecentMedia(decryptToken(account.access_token));
}
