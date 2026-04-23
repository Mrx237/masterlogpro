import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MotivationBanner } from "@/components/MotivationBanner";
import {
  ArrowLeft, MessageSquare, Loader2, Newspaper, Target, Calendar,
  Brain, Sparkles, TrendingUp, TrendingDown, Minus, RefreshCw, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Analysis {
  id: string; title: string; market_state: string | null; key_news: string | null;
  expected_direction: string | null; week_start: string; created_at: string;
}

interface BotEvent { title: string; when: string; impact: string; sentiment: string }
interface BotZone {
  currency: string; flag: string; name: string;
  score: number; bias: "bullish" | "bearish" | "neutral";
  interpretation: string; conclusion: string; pairs: string[]; events: BotEvent[];
}
interface BotResult {
  week_start: string; week_end: string;
  total_events: number; high_impact: number;
  summary: string; zones: BotZone[];
}

const Analyse = () => {
  const { isStudent, isAdmin } = useAuth();
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [bot, setBot] = useState<BotResult | null>(null);
  const [botLoading, setBotLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyses = async () => {
    const { data } = await supabase.from("weekly_analyses")
      .select("*").eq("is_published", true).order("week_start", { ascending: false });
    if (data) setItems(data as Analysis[]);
    setLoading(false);
  };

  const loadBot = async () => {
    setBotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyse-bot");
      if (error) throw error;
      setBot(data as BotResult);
    } catch (e: any) {
      console.error(e);
    } finally {
      setBotLoading(false);
    }
  };

  useEffect(() => { loadAnalyses(); loadBot(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke("fetch-news");
      await loadBot();
      toast.success("Analyse mise à jour");
    } catch {
      toast.error("Échec de la mise à jour");
    } finally {
      setRefreshing(false);
    }
  };

  if (!isStudent && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-12">
          <Card className="glass p-10 text-center max-w-md mx-auto">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-display text-xl font-bold mb-2">Réservé aux élèves</h2>
            <p className="text-sm text-muted-foreground mb-5">L'analyse hebdomadaire est offerte avec la formation.</p>
            <Button asChild className="bg-gradient-gold text-student-foreground border-0">
              <Link to="/subscribe?offer=formation">Rejoindre la formation</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const latest = items[0];
  const previous = items.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-10 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-3 w-3" /> Dashboard
            </Link>
            <h1 className="font-display text-3xl md:text-4xl font-bold">📊 Analyse hebdomadaire</h1>
            <p className="text-sm text-muted-foreground mt-1">Synthèse experte des news et biais directionnels de la semaine.</p>
          </div>
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="gap-2 shrink-0">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        </div>

        {/* BOT EXPERT */}
        <Card className="glass-strong p-5 md:p-7 border border-primary/30 shadow-[0_0_50px_-25px_hsl(var(--primary))] relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand">
                <Brain className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <div className="font-display font-bold text-lg">🤖 Analyse experte du marché</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-mono inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Bot fondamental · MAJ auto
                </div>
              </div>
            </div>

            {botLoading ? (
              <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !bot ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Analyse indisponible. Clique sur Actualiser.</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5">
                  <Stat label="Évènements" value={bot.total_events.toString()} />
                  <Stat label="Fort impact" value={bot.high_impact.toString()} accent />
                  <Stat label="Devises suivies" value={bot.zones.length.toString()} />
                </div>

                <div className="rounded-lg border border-border/60 bg-background/40 p-3 mb-5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    <Activity className="h-3 w-3" /> Vue d'ensemble
                  </div>
                  <p className="text-sm" dangerouslySetInnerHTML={{ __html: renderBold(bot.summary) }} />
                </div>

                {bot.zones.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted-foreground">Biais par devise</div>
                    {bot.zones.map((z) => <ZoneCard key={z.currency} z={z} />)}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Note coach (analyses admin) */}
        {loading ? null : latest && (
          <Card className="glass p-5 md:p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-mono text-student mb-3">
              <Calendar className="h-3 w-3" />
              📝 Note du coach · semaine du {new Date(latest.week_start).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
            </div>
            <h2 className="font-display text-xl md:text-2xl font-bold mb-4">{latest.title}</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <Block icon={Target} title="État du marché" content={latest.market_state} />
              <Block icon={Newspaper} title="News importantes" content={latest.key_news} />
              <Block icon={MessageSquare} title="Direction possible" content={latest.expected_direction} highlight />
            </div>
          </Card>
        )}

        {previous.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-3">Archives coach</div>
            <div className="grid md:grid-cols-2 gap-3">
              {previous.map((a) => (
                <Card key={a.id} className="glass p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Semaine du {new Date(a.week_start).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </div>
                  <h3 className="font-display font-bold mt-1">{a.title}</h3>
                  {a.expected_direction && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{a.expected_direction}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}

        <MotivationBanner tone="gold" />
      </main>
    </div>
  );
};

function renderBold(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>");
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-2.5 text-center">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("font-display font-bold text-lg md:text-xl", accent && "text-primary")}>{value}</div>
    </div>
  );
}

function ZoneCard({ z }: { z: BotZone }) {
  const Bias = z.bias === "bullish" ? TrendingUp : z.bias === "bearish" ? TrendingDown : Minus;
  const tone =
    z.bias === "bullish" ? "border-emerald-500/40 bg-emerald-500/5"
    : z.bias === "bearish" ? "border-rose-500/40 bg-rose-500/5"
    : "border-amber-400/40 bg-amber-400/5";
  const biasColor =
    z.bias === "bullish" ? "text-emerald-400"
    : z.bias === "bearish" ? "text-rose-400"
    : "text-amber-400";

  return (
    <div className={cn("rounded-xl border p-4", tone)}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{z.flag}</span>
          <div>
            <div className="font-display font-bold">{z.name}</div>
            <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{z.currency}</div>
          </div>
        </div>
        <div className={cn("inline-flex items-center gap-1.5 text-sm font-display font-bold", biasColor)}>
          <Bias className="h-4 w-4" />
          {z.bias === "bullish" ? "Haussier" : z.bias === "bearish" ? "Baissier" : "Neutre"}
        </div>
      </div>

      <p className="text-sm text-foreground/90 mb-2" dangerouslySetInnerHTML={{ __html: renderBold(z.interpretation) }} />
      <div className="text-sm font-display font-semibold mb-3" dangerouslySetInnerHTML={{ __html: renderBold(z.conclusion) }} />

      {z.pairs.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Paires à surveiller</div>
          <div className="flex flex-wrap gap-1.5">
            {z.pairs.map((p) => (
              <Badge key={p} variant="outline" className="font-mono text-xs border-primary/30 text-primary">{p}</Badge>
            ))}
          </div>
        </div>
      )}

      {z.events.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">News clés cette semaine</div>
          <ul className="space-y-1">
            {z.events.map((e, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  e.impact === "high" ? "bg-rose-500" : e.impact === "medium" ? "bg-amber-400" : "bg-emerald-500"
                )} />
                <span className="truncate flex-1">{e.title}</span>
                <span className="font-mono shrink-0">{new Date(e.when).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Block({ icon: Icon, title, content, highlight }: { icon: any; title: string; content: string | null; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-student/10 border border-student/30" : "bg-secondary/40"}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-mono text-muted-foreground mb-2">
        <Icon className={`h-3.5 w-3.5 ${highlight ? "text-student" : ""}`} />
        {title}
      </div>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{content || "—"}</p>
    </div>
  );
}

export default Analyse;
