import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { refreshLongLivedToken } from "@/lib/meta/instagram-api";

// GET /api/cron/refresh-tokens — roda 1x/dia (ver vercel.json). Tokens de
// longa duração do Instagram expiram em ~60 dias; renovamos com folga
// (7 dias antes) para nunca deixar uma conta cair em "token_expired".
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: accounts } = await admin
    .from("instagram_accounts")
    .select("*")
    .eq("status", "connected")
    .lte("token_expires_at", sevenDaysFromNow);

  let refreshed = 0;

  for (const account of accounts ?? []) {
    try {
      const currentToken = decryptToken(account.access_token);
      const { access_token, expires_in } = await refreshLongLivedToken(currentToken);

      await admin
        .from("instagram_accounts")
        .update({
          access_token: encryptToken(access_token),
          token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        })
        .eq("id", account.id);

      refreshed++;
    } catch (error) {
      console.error("[cron/refresh-tokens]", account.id, error);
      await admin.from("instagram_accounts").update({ status: "token_expired" }).eq("id", account.id);
    }
  }

  return NextResponse.json({ refreshed, checked: accounts?.length ?? 0 });
}
