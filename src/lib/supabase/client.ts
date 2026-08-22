import { createBrowserClient } from "@supabase/ssr";

// Client para uso em Client Components. As tabelas são tipadas manualmente em
// `src/types/database.ts` e aplicadas nas camadas de acesso a dados (`src/lib/data`),
// não diretamente no client do Supabase.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
