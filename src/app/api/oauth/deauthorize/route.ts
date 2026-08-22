import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSignedRequest } from "@/lib/crypto";

// POST /api/oauth/deauthorize — a Meta chama esta URL quando o usuário remove
// o app pelas configurações do Instagram. Cadastrada na Seção 4 do app Meta.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const signedRequest = form.get("signed_request");

  if (typeof signedRequest !== "string") {
    return NextResponse.json({ error: "signed_request ausente" }, { status: 400 });
  }

  const payload = parseSignedRequest(signedRequest);
  if (!payload || typeof payload.user_id !== "string") {
    return NextResponse.json({ error: "signed_request inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("instagram_accounts")
    .update({ status: "disconnected" })
    .eq("instagram_business_id", payload.user_id);

  return NextResponse.json({ success: true });
}
