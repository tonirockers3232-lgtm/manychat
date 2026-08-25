import { Badge } from "@/components/ui/badge";
import type { AnalyticsSummary } from "@/lib/data/analytics";

const BAR_COLOR = "#2a78d6"; // series slot 1 (references/palette.md)

export function AutomationRanking({ automations }: { automations: AnalyticsSummary["automationRanking"] }) {
  if (automations.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma execução registrada ainda.</p>;
  }

  const max = Math.max(1, ...automations.map((a) => a.runCount));

  return (
    <div className="space-y-3">
      {automations.slice(0, 8).map((a) => (
        <div key={a.id} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-medium">{a.name}</span>
              {a.keywords.slice(0, 2).map((k) => (
                <Badge key={k} variant="outline" className="shrink-0">
                  {k}
                </Badge>
              ))}
            </div>
            <span className="shrink-0 text-sm font-medium tabular-nums">{a.runCount}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-2 rounded-full"
              style={{ width: `${Math.max((a.runCount / max) * 100, 3)}%`, backgroundColor: BAR_COLOR }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
