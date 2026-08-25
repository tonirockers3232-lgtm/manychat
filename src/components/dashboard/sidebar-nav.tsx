"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Instagram,
  Inbox,
  Workflow,
  Users,
  Tags,
  KeyRound,
  BarChart3,
  ScrollText,
  History,
  Settings,
  CreditCard,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/instagram", label: "Instagram", icon: Instagram },
  { href: "/dashboard/inbox", label: "Caixa de entrada", icon: Inbox },
  { href: "/dashboard/automations", label: "Automações", icon: Workflow },
  { href: "/dashboard/keywords", label: "Palavras-chave", icon: KeyRound },
  { href: "/dashboard/contacts", label: "Contatos", icon: Users },
  { href: "/dashboard/segments", label: "Segmentos", icon: Tags },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText },
  { href: "/dashboard/audit-logs", label: "Auditoria", icon: History },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
  { href: "/dashboard/subscription", label: "Assinatura", icon: CreditCard },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
