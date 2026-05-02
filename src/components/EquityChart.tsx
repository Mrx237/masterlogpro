import { useMemo } from "react";
import {
  ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Sparkles } from "lucide-react";

interface TradePoint { trade_at: string; result_usd: number | null }

export function EquityChart({ trades, tone = "cyan" }: { trades: TradePoint[]; tone?: "cyan" | "gold" }) {
  const data = useMemo(() => {
    const sorted = [...trades]
      .filter((t) => t.result_usd != null)
      .sort((a, b) => new Date(a.trade_at).getTime() - new Date(b.trade_at).getTime());
    let cum = 0;
    const byDay = new Map<string, number>();
    sorted.forEach((t) => {
      const k = new Date(t.trade_at).toISOString().slice(0, 10);
      byDay.set(k, (byDay.get(k) ?? 0) + Number(t.result_usd));
    });
    return Array.from(byDay.entries()).map(([day, daily]) => {
      cum += daily;
      return {
        day,
        label: new Date(day).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        daily: Number(daily.toFixed(2)),
        equity: Number(cum.toFixed(2)),
      };
    });
  }, [trades]);

  const stroke = tone === "gold" ? "hsl(var(--student))" : "hsl(var(--primary))";
  const gradId = tone === "gold" ? "eqGold" : "eqCyan";
  const validTrades = trades.filter((t) => t.result_usd != null).length;

  if (data.length === 0) {
    return (
      <div className="min-h-[220px] grid place-items-center text-center px-4 py-6">
        <div className="space-y-2">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Ajoute des trades avec un résultat pour voir ta courbe d'équité.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-[220px] h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 14, bottom: 0, left: -14 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.5} />
                <stop offset="95%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(v: number, name: string) => [`${v > 0 ? "+" : ""}${v.toFixed(2)} $`, name === "equity" ? "Capital cumulé" : "P&L jour"]}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar dataKey="daily" radius={[4, 4, 0, 0]} barSize={14} fill="hsl(var(--muted-foreground) / 0.35)" />
            <Area type="monotone" dataKey="equity" stroke={stroke} strokeWidth={2.5} fill={`url(#${gradId})`} animationDuration={900} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {validTrades < 2 && (
        <p className="text-xs text-muted-foreground text-center mt-3 italic">
          Ajoute au moins 2 trades pour voir ta courbe évoluer.
        </p>
      )}
    </>
  );
}
