import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl } from "@/lib/meta/instagram-api";
import { signOAuthState } from "@/lib/crypto";

// GET /api/oauth/connect?org=<organization_id>
// Ponto de entrada do botão "Conectar Instagram" no dashboard.
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("org");
  if (!organizationId) {
    return NextResponse.json({ error: "Parâmetro 'org' é obrigatório" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Você não pertence a esta organização" }, { status: 403 });
  }

  const state = signOAuthState({ organizationId, userId: user.id, nonce: randomUUID() });
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
