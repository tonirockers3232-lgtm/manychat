import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  getInstagramProfile,
} from "@/lib/meta/instagram-api";
import { encryptToken, verifyOAuthState } from "@/lib/crypto";

// GET /api/oauth/callback — URI de redirecionamento cadastrada na Seção 4 do
// app Meta ("Configurar o login da empresa no Instagram").
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error_description");

  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (oauthError) {
    return redirectTo(`/dashboard/instagram?error=${encodeURIComponent(oauthError)}`);
  }
  if (!code || !state) {
    return redirectTo("/dashboard/instagram?error=missing_params");
  }

  const statePayload = verifyOAuthState(state);
  if (!statePayload) {
    return redirectTo("/dashboard/instagram?error=invalid_state");
  }

  try {
    const shortLived = await exchangeCodeForShortLivedToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const profile = await getInstagramProfile(longLived.access_token);

    const admin = createAdminClient();
    await admin.from("instagram_accounts").upsert(
      {
        organization_id: statePayload.organizationId,
        instagram_business_id: profile.user_id,
        username: profile.username,
        name: profile.name ?? null,
        profile_pic_url: profile.profile_picture_url ?? null,
        access_token: encryptToken(longLived.access_token),
        token_expires_at: new Date(Date.now() + longLived.expires_in * 1000).toISOString(),
        status: "connected",
        connected_by: statePayload.userId,
      },
      { onConflict: "organization_id,instagram_business_id" }
    );

    return redirectTo("/dashboard/instagram?connected=1");
  } catch (error) {
    console.error("[oauth/callback]", error);
    return redirectTo("/dashboard/instagram?error=connection_failed");
  }
}
