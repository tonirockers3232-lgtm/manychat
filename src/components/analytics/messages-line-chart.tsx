"use client";

import { useRef, useState } from "react";

const SERIES = {
  inbound: { label: "Recebidas", color: "#2a78d6" }, // slot 1
  outbound: { label: "Enviadas", color: "#eb6834" }, // slot 2
};

const WIDTH = 700;
const HEIGHT = 220;
const MARGIN = { top: 12, right: 12, bottom: 24, left: 32 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function formatDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function MessagesLineChart({ data }: { data: Array<{ date: string; inbound: number; outbound: number }> }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const maxValue = niceMax(Math.max(1, ...data.flatMap((d) => [d.inbound, d.outbound])));
  const stepX = data.length > 1 ? PLOT_W / (data.length - 1) : 0;
  const x = (i: number) => MARGIN.left + i * stepX;
  const y = (v: number) => MARGIN.top + PLOT_H - (v / maxValue) * PLOT_H;

  function pathFor(key: "inbound" | "outbound") {
    return data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");
  }

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const relative = (px - MARGIN.left) / (stepX || 1);
    const index = Math.min(data.length - 1, Math.max(0, Math.round(relative)));
    setHoverIndex(index);
  }

  const gridLines = [0, 0.5, 1].map((f) => maxValue * f);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
        {Object.entries(SERIES).map(([key, s]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {gridLines.map((v) => (
            <g key={v}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(v)} y2={y(v)} stroke="#e1e0d9" strokeWidth={1} />
              <text x={MARGIN.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[9px]">
                {Math.round(v)}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={d.date} x={x(i)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {formatDay(d.date)}
              </text>
            ) : null
          )}

          {hoverIndex !== null && (
            <line
              x1={x(hoverIndex)}
              x2={x(hoverIndex)}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_H}
              stroke="#c3c2b7"
              strokeWidth={1}
            />
          )}

          {(["inbound", "outbound"] as const).map((key) => (
            <path key={key} d={pathFor(key)} fill="none" stroke={SERIES[key].color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {hoverIndex !== null &&
            (["inbound", "outbound"] as const).map((key) => (
              <circle
                key={key}
                cx={x(hoverIndex)}
                cy={y(data[hoverIndex][key])}
                r={4}
                fill={SERIES[key].color}
                stroke="#fcfcfb"
                strokeWidth={2}
              />
            ))}
        </svg>

        {hovered && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${(x(hoverIndex) / WIDTH) * 100}%` }}
          >
            <p className="mb-1 font-medium text-popover-foreground">{formatDay(hovered.date)}</p>
            {(["inbound", "outbound"] as const).map((key) => (
              <p key={key} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: SERIES[key].color }} />
                <span className="font-medium text-popover-foreground">{hovered[key]}</span> {SERIES[key].label.toLowerCase()}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
