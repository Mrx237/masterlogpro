import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Brain, TrendingUp, TrendingDown, Minus, Sparkles, MapPin, Lightbulb, Activity, Target, ArrowUpCircle, ArrowDownCircle, PauseCircle } from "lucide-react";
import { generateAnalysis, impactLabel, sentimentLabel, type Impact, type Sentiment } from "@/lib/newsBot";

function renderBold(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>");
}

interface NewsRow {
  id: string;
  title: string;
  currency: string;
  country: string | null;
  event_at: string;
  summary: string | null;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  impact: Impact;
  sentiment: Sentiment;
  admin_analysis: string | null;
}

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [n, setN] = useState<NewsRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase.from("economic_news").select("*").eq("id", id).maybeSingle();
      setN(data as NewsRow | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-background"><AppHeader />
      <div className="grid place-items-center py-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
    </div>
  );

  if (!n) return (
    <div className="min-h-screen bg-background"><AppHeader />
      <main className="container py-10 max-w-3xl">
        <Card className="glass p-10 text-center"><div className="text-sm text-muted-foreground">News introuvable.</div>
          <Button asChild variant="outline" className="mt-4"><Link to="/news"><ArrowLeft className="h-4 w-4" /> Retour</Link></Button>
        </Card>
      </main>
    </div>
  );

  const a = generateAnalysis({ title: n.title, currency: n.currency, impact: n.impact, sentiment: n.sentiment });
  const SentIcon = n.sentiment === "bullish" ? TrendingUp : n.sentiment === "bearish" ? TrendingDown : Minus;
  const sentColor = n.sentiment === "bullish" ? "text-emerald-400" : n.sentiment === "bearish" ? "text-rose-400" : "text-muted-foreground";
  const impactColor = n.impact === "high" ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
    : n.impact === "medium" ? "bg-amber-400/15 text-amber-300 border-amber-400/30"
    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AppHeader />
      <div className="absolute top-0 right-0 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <main className="container relative py-6 md:py-10 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2"><Link to="/news"><ArrowLeft className="h-4 w-4" /> Toutes les news</Link></Button>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="font-mono text-[10px]">{n.currency}</Badge>
          <Badge className={`border ${impactColor}`}>Impact {impactLabel(n.impact)}</Badge>
          <Badge variant="outline" className={`inline-flex items-center gap-1 ${sentColor}`}><SentIcon className="h-3 w-3" />{sentimentLabel(n.sentiment)}</Badge>
          <span className="text-xs text-muted-foreground font-mono">{new Date(n.event_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}</span>
        </div>

        <h1 className="font-display text-2xl md:text-4xl font-bold leading-tight mb-3">{n.title}</h1>
        {n.summary && <p className="text-muted-foreground mb-6">{n.summary}</p>}

        {(n.actual || n.forecast || n.previous) && (
          <Card className="glass p-4 mb-6 grid grid-cols-3 gap-3">
            <Stat label="Réel" value={n.actual} accent />
            <Stat label="Prévision" value={n.forecast} />
            <Stat label="Précédent" value={n.previous} />
          </Card>
        )}

        {/* Bot d'analyse */}
        <Card className="glass-strong p-5 md:p-6 border border-primary/30 shadow-[0_0_40px_-20px_hsl(var(--primary))]">
          <div className="flex items-center gap-2 mb-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display font-bold text-lg">Analyse simplifiée</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-mono inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Bot pédagogique
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm md:text-[15px] leading-relaxed">
            <p className="whitespace-pre-line" dangerouslySetInnerHTML={{ __html: a.meaning.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>") }} />
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">📊 Direction probable</div>
              <div className="font-display text-base font-semibold" dangerouslySetInnerHTML={{ __html: a.direction.replace(/\*\*(.+?)\*\*/g, "<span class='text-primary'>$1</span>") }} />
            </div>
            {a.pairs.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Paires à surveiller</div>
                <div className="flex flex-wrap gap-2">
                  {a.pairs.map((p) => (
                    <Badge key={p} variant="outline" className="font-mono text-xs border-primary/30 text-primary">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground italic">{a.market}</p>
          </div>

          {n.admin_analysis && (
            <div className="mt-5 pt-5 border-t border-border/50">
              <div className="text-[10px] uppercase tracking-widest text-accent font-mono mb-2">📝 Note du coach</div>
              <p className="text-sm whitespace-pre-line">{n.admin_analysis}</p>
            </div>
          )}
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-6 italic">
          « Les meilleurs traders sont ceux qui analysent leurs erreurs. »
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | null; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className={`font-display font-bold ${accent ? "text-primary text-lg" : ""}`}>{value ?? "—"}</div>
    </div>
  );
}
