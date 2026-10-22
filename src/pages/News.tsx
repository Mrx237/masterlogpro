import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Newspaper, TrendingUp, TrendingDown, Minus, ArrowRight, Search, CalendarDays, CalendarRange, CalendarCheck, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getActiveNewsRange, getDefaultNewsRange, sortEconomicNews, toUnixSeconds, type NewsTimeRange } from "@/lib/newsDates";
import { impactLabel, sentimentLabel, type Impact, type Sentiment } from "@/lib/newsBot";

interface NewsRow {
  id: string;
  title: string;
  currency: string;
  country: string | null;
  event_at: string;
  summary: string | null;
  impact: Impact;
  sentiment: Sentiment;
}

function impactDot(i: Impact) {
  return i === "high" ? "bg-rose-500" : i === "medium" ? "bg-amber-400" : "bg-emerald-500";
}
function impactBorder(i: Impact) {
  return i === "high" ? "border-rose-500/30 shadow-[0_0_24px_-12px_rgba(244,63,94,0.6)]"
    : i === "medium" ? "border-amber-400/30"
    : "border-emerald-500/30";
}
function SentIcon({ s }: { s: Sentiment }) {
  if (s === "bullish") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (s === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-rose-400" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function News() {
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Impact>("all");
  const [q, setQ] = useState("");
  const [dateMode, setDateMode] = useState<"all" | "today" | "week" | "custom">("all");
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const getRange = useCallback((): NewsTimeRange => {
    return getActiveNewsRange(dateMode, customDate) ?? getDefaultNewsRange();
  }, [dateMode, customDate]);

  const load = useCallback(async (options?: { forceRefresh?: boolean }) => {
    const range = getRange();
    const cacheKey = `economic-news:${range.fromDate}:${range.toDate}`;

    setLoading(true);

    if (!options?.forceRefresh) {
      const rawCache = localStorage.getItem(cacheKey);
      if (rawCache) {
        try {
          const parsed = JSON.parse(rawCache) as { timestamp: number; rows: NewsRow[] };
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            setRows(sortEconomicNews(parsed.rows));
            setLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }
    }

    const { data, error } = await supabase
      .from("economic_news")
      .select("id,title,currency,country,event_at,summary,impact,sentiment")
      .gte("event_at", range.fromIso)
      .lte("event_at", range.toIso)
      .limit(5000);

    if (error) {
      toast.error("Impossible de charger les news");
      setRows([]);
      setLoading(false);
      return;
    }

    const sorted = sortEconomicNews((data ?? []) as NewsRow[]);
    setRows(sorted);
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), rows: sorted }));
    setLoading(false);
  }, [getRange]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => { void load({ forceRefresh: true }); }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  const refresh = async () => {
    const range = getRange();
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-news", {
        body: { from: range.fromDate, to: range.toDate },
      });
      if (error) throw error;
      toast.success(`${data?.upserted ?? 0} news synchronisées`);
      await load({ forceRefresh: true });
    } catch (e: any) {
      toast.error("Échec de la synchro : " + (e?.message ?? "inconnu"));
    } finally {
      setRefreshing(false);
    }
  };

  const [autoTried, setAutoTried] = useState(false);
  useEffect(() => {
    if (autoTried || loading || refreshing || rows.length > 0) return;
    setAutoTried(true);
    void refresh();
  }, [autoTried, loading, refreshing, rows.length]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter !== "all" && r.impact !== filter) return false;
    if (q && !`${r.title} ${r.currency} ${r.country ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;

    const activeRange = getActiveNewsRange(dateMode, customDate);
    if (activeRange) {
      const eventTs = toUnixSeconds(r.event_at);
      const fromTs = toUnixSeconds(activeRange.fromIso);
      const toTs = toUnixSeconds(activeRange.toIso);
      if (eventTs < fromTs || eventTs > toTs) return false;
    }

    return true;
  }), [rows, filter, q, dateMode, customDate]);

  const dateBtn = (mode: typeof dateMode, icon: React.ReactNode, label: string) => (
    <Button size="sm" variant={dateMode === mode ? "default" : "outline"}
      onClick={() => { setDateMode(mode); if (mode !== "custom") setCustomDate(undefined); }}
      className={cn("gap-1.5", dateMode === mode && "bg-gradient-brand text-primary-foreground border-0")}>
      {icon}{label}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AppHeader />
      <div className="absolute top-0 right-0 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <main className="container relative py-6 md:py-10 max-w-6xl">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-mono mb-2">
          <Newspaper className="h-3 w-3" /> Actualités
        </div>
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-4xl font-bold mb-2">News économiques</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              📊 Les meilleurs traders sont ceux qui analysent les news avant de trader.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="gap-2 shrink-0">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        </div>

        <Card className="glass p-3 md:p-4 mb-5 space-y-3">
          {/* Filtres rapides date */}
          <div className="flex flex-wrap gap-1.5">
            {dateBtn("all", <CalendarRange className="h-3.5 w-3.5" />, "Toutes")}
            {dateBtn("today", <CalendarCheck className="h-3.5 w-3.5" />, "Aujourd'hui")}
            {dateBtn("week", <CalendarRange className="h-3.5 w-3.5" />, "Cette semaine")}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant={dateMode === "custom" ? "default" : "outline"}
                  className={cn("gap-1.5", dateMode === "custom" && "bg-gradient-brand text-primary-foreground border-0")}>
                  <CalendarDays className="h-3.5 w-3.5" />
                  {customDate ? format(customDate, "d MMM", { locale: fr }) : "Choisir"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customDate}
                  onSelect={(d) => { setCustomDate(d); if (d) setDateMode("custom"); }}
                  initialFocus className="p-3 pointer-events-auto" locale={fr} />
              </PopoverContent>
            </Popover>
            {dateMode !== "all" && (
              <Button size="sm" variant="ghost" onClick={() => { setDateMode("all"); setCustomDate(undefined); }} className="gap-1 text-muted-foreground">
                <X className="h-3 w-3" /> Réinitialiser
              </Button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher (NFP, USD, CPI…)" className="pl-9 h-10 bg-background/40" />
            </div>
            <div className="flex gap-1.5">
              {(["all","high","medium","low"] as const).map(k => (
                <Button key={k} size="sm" variant={filter === k ? "default" : "outline"}
                  onClick={() => setFilter(k)}
                  className={filter === k ? "bg-gradient-brand text-primary-foreground border-0" : ""}>
                  {k === "all" ? "Tous" : impactLabel(k as Impact)}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="glass p-10 text-center text-sm text-muted-foreground space-y-3">
            <p>Aucune news économique importante pour cette {dateMode === "custom" ? "date" : dateMode === "today" ? "journée" : dateMode === "week" ? "semaine" : "sélection"}.</p>
            <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="gap-2">
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Actualiser
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((n) => (
              <Link key={n.id} to={`/news/${n.id}`} className="group">
                <Card className={`glass p-4 border ${impactBorder(n.impact)} transition-all hover:-translate-y-0.5 hover:bg-card/80`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${impactDot(n.impact)} animate-pulse-glow`} />
                      <Badge variant="outline" className="font-mono text-[10px] tracking-wider">{n.currency}</Badge>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{impactLabel(n.impact)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><SentIcon s={n.sentiment} />{sentimentLabel(n.sentiment)}</div>
                  </div>
                  <h3 className="font-display font-bold mt-2 leading-tight line-clamp-2">{n.title}</h3>
                  {n.summary && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{n.summary}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <div className="text-[11px] text-muted-foreground font-mono">{new Date(n.event_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</div>
                    <div className="text-[11px] text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">Analyse <ArrowRight className="h-3 w-3" /></div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
