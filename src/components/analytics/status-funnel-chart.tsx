import { STATUS_LABEL } from "@/components/contacts/contact-status-select";
import type { ContactStatus } from "@/types/database";

// Passos ordinais do azul sequencial (references/palette.md) — no claro, o
// degrau mais próximo da superfície não pode ser mais claro que o 250 (2:1).
const ORDINAL_STEPS = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];

export function StatusFunnelChart({ data }: { data: Array<{ status: ContactStatus; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-2.5">
      {data.map((row, i) => (
        <div key={row.status} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-sm text-muted-foreground">{STATUS_LABEL[row.status]}</span>
          <div className="relative h-6 flex-1 min-w-0">
            <div
              className="h-6 rounded-r-[4px]"
              style={{ width: `${Math.max((row.count / max) * 100, row.count > 0 ? 3 : 0)}%`, backgroundColor: ORDINAL_STEPS[i] }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">{row.count}</span>
        </div>
      ))}
    </div>
  );
}
