import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client com service_role — ignora RLS. Uso exclusivo em código server-only:
// webhook do Meta, callback de OAuth e o cron de automações, onde não há
// sessão de usuário autenticado para basear as policies.
// NUNCA importar este arquivo em Client Components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
