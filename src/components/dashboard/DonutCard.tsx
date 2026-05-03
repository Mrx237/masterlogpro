import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export interface DonutSegment {
  name: string;
  value: number;
  color: string; // hsl var like "hsl(var(--gain))"
}

interface DonutCardProps {
  title: string;
  description?: string;
  centerValue: string;
  centerLabel?: string;
  centerColorClass?: string;
  segments: DonutSegment[];
  badge?: { label: string; tone: "gain" | "warn" | "loss" | "primary" };
  emptyMessage?: string;
}

export function DonutCard({
  title, description, centerValue, centerLabel,
  centerColorClass = "text-foreground",
  segments, badge, emptyMessage,
}: DonutCardProps) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const isEmpty = total <= 0;

  const data = isEmpty
    ? [{ name: "—", value: 1, color: "hsl(var(--muted))" }]
    : segments;

  const badgeStyles: Record<string, string> = {
    gain: "bg-gain/15 text-gain border-gain/30",
    warn: "bg-[hsl(var(--warn))]/15 text-[hsl(var(--warn))] border-[hsl(var(--warn))]/30",
    loss: "bg-loss/15 text-loss border-loss/30",
    primary: "bg-primary/15 text-primary border-primary/30",
  };

  return (
    <Card className="glass-strong relative overflow-hidden p-5 rounded-2xl">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="relative flex items-start justify-between mb-2">
        <div>
          <h3 className="font-display text-base font-bold leading-tight">{title}</h3>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {badge && (
          <span className={cn("text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md border", badgeStyles[badge.tone])}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="relative h-[200px] animate-fade-in">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="68%"
              outerRadius="92%"
              paddingAngle={isEmpty ? 0 : 3}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              animationBegin={150}
              animationDuration={900}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            {!isEmpty && (
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any, n: any) => [`${v}`, n]}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className={cn("font-mono font-bold text-2xl md:text-3xl tracking-tight", centerColorClass)}>
            {isEmpty ? "—" : centerValue}
          </div>
          {centerLabel && (
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              {isEmpty ? "Aucun trade" : centerLabel}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {!isEmpty && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {segments.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
              <span>{s.name}</span>
              <span className="font-mono text-foreground/80">{s.value}</span>
            </div>
          ))}
        </div>
      )}
      {isEmpty && emptyMessage && (
        <p className="text-[11px] text-center text-muted-foreground mt-3">{emptyMessage}</p>
      )}
    </Card>
  );
}
