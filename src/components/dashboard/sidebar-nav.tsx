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
  Megaphone,
} from "lucide-react";

// Cada item carrega a cor do seu "chip" de ícone — precisa ser uma classe
// Tailwind literal (não montada via template string) pra o scanner do
// Tailwind v4 gerar o CSS; ver COLOR_CHIP abaixo.
type NavColor = "violet" | "blue" | "pink" | "amber" | "emerald" | "cyan" | "rose" | "slate";

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: typeof LayoutDashboard; color: NavColor }>;
}> = [
  {
    label: "Painel",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard, color: "violet" },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, color: "blue" },
    ],
  },
  {
    label: "Instagram",
    items: [
      { href: "/dashboard/instagram", label: "Instagram", icon: Instagram, color: "pink" },
      { href: "/dashboard/inbox", label: "Caixa de entrada", icon: Inbox, color: "cyan" },
    ],
  },
  {
    label: "Automação",
    items: [
      { href: "/dashboard/automations", label: "Automações", icon: Workflow, color: "violet" },
      { href: "/dashboard/keywords", label: "Palavras-chave", icon: KeyRound, color: "amber" },
      { href: "/dashboard/broadcasts", label: "Mensagem em massa", icon: Megaphone, color: "rose" },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/dashboard/contacts", label: "Contatos", icon: Users, color: "emerald" },
      { href: "/dashboard/segments", label: "Segmentos", icon: Tags, color: "cyan" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/dashboard/logs", label: "Logs", icon: ScrollText, color: "slate" },
      { href: "/dashboard/audit-logs", label: "Auditoria", icon: History, color: "slate" },
    ],
  },
  {
    label: "Conta",
    items: [
      { href: "/dashboard/settings", label: "Configurações", icon: Settings, color: "slate" },
      { href: "/dashboard/subscription", label: "Assinatura", icon: CreditCard, color: "amber" },
    ],
  },
];

const COLOR_CHIP: Record<NavColor, string> = {
  violet: "bg-violet-100 text-violet-600",
  blue: "bg-blue-100 text-blue-600",
  pink: "bg-pink-100 text-pink-600",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
  cyan: "bg-cyan-100 text-cyan-600",
  rose: "bg-rose-100 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
};

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4 p-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map(({ href, label, icon: Icon, color }) => {
              const active = href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/80 hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                      active ? "bg-white/20 text-white" : COLOR_CHIP[color]
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
