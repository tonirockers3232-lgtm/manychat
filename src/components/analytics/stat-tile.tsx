import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type StatColor = "violet" | "blue" | "pink" | "amber" | "emerald" | "cyan" | "rose";

// Classes literais (não montadas via template string) pra o scanner do
// Tailwind v4 gerar o CSS — mesmo padrão de src/components/dashboard/sidebar-nav.tsx.
const COLOR_CHIP: Record<StatColor, string> = {
  violet: "bg-violet-100 text-violet-600",
  blue: "bg-blue-100 text-blue-600",
  pink: "bg-pink-100 text-pink-600",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
  cyan: "bg-cyan-100 text-cyan-600",
  rose: "bg-rose-100 text-rose-600",
};

export function StatTile({
  label,
  value,
  icon: Icon,
  color = "violet",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  color?: StatColor;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
        </div>
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${COLOR_CHIP[color]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}
