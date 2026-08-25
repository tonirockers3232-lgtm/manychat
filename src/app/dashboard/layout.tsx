import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Zap } from "lucide-react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const organization = await getCurrentOrganization();
  if (!organization) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r bg-sidebar md:block">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
            <Zap className="h-4 w-4 fill-white" />
          </span>
          <span className="text-base font-bold tracking-tight">InstaFlow</span>
        </div>
        <SidebarNav />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
          <span className="text-sm font-medium text-muted-foreground">{organization.name}</span>
          <UserMenu email={user.email ?? ""} />
        </header>
        <main className="flex-1 bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  );
}
