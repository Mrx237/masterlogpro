import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PAIRS } from "@/lib/constants";
import { MotivationBanner } from "@/components/MotivationBanner";
import { Plus, Loader2, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradeFull {
  id: string;
  trade_at: string;
  pair: string;
  direction: "buy" | "sell";
  entry_price: number | null; exit_price: number | null;
  stop_loss: number | null; take_profit: number | null; lot_size: number | null;
  result_usd: number | null;
  status: "win" | "loss" | "breakeven" | null;
  technical_comment: string | null;
  news_event: string | null; news_impact: string | null; sentiment: string | null;
  fundamental_note: string | null;
  screenshot_path: string | null;
  coach_feedback: string | null;
}

const Trades = () => {
  const { user, isStudent } = useAuth();
  const [trades, setTrades] = useState<TradeFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairFilter, setPairFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<TradeFull | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("trades").select("*").order("trade_at", { ascending: false });
      if (data) setTrades(data as any);
      setLoading(false);
    })();
  }, [user]);

  async function openDetail(t: TradeFull) {
    setActive(t);
    setShotUrl(null);
    if (t.screenshot_path) {
      const { data } = await supabase.storage.from("trade-screenshots").createSignedUrl(t.screenshot_path, 600);
      setShotUrl(data?.signedUrl ?? null);
    }
  }

  const filtered = trades.filter((t) => {
    if (pairFilter !== "all" && t.pair !== pairFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search && !t.pair.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tone = isStudent ? "gold" : "cyan";

  return (
    <div className="min-h-screen bg-background relative">
      <AppHeader />
      <main className="container py-6 md:py-10 space-y-6">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Mes trades</h1>
            <p className="text-sm text-muted-foreground mt-1">Clique sur un trade pour voir le détail{isStudent ? " et le feedback du coach" : ""}.</p>
          </div>
          <Button asChild size="lg" className={cn("h-11 px-5 font-semibold border-0 text-primary-foreground", tone === "gold" ? "bg-gradient-gold glow-gold" : "bg-gradient-brand glow-cyan")}>
            <Link to="/trades/new"><Plus className="h-4 w-4" /> Ajouter</Link>
          </Button>
        </div>

        <Card className="glass p-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Input placeholder="Rechercher une paire..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={pairFilter} onValueChange={setPairFilter}>
              <SelectTrigger><SelectValue placeholder="Paire" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les paires</SelectItem>
                {PAIRS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="win">Gagnant</SelectItem>
                <SelectItem value="loss">Perdant</SelectItem>
                <SelectItem value="breakeven">BE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="glass overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Aucun trade encore. <Link to="/trades/new" className="text-primary underline">Ajoute ton premier trade</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Paire</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Résultat</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} onClick={() => openDetail(t)} className="border-t border-border/50 hover:bg-secondary/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3">{new Date(t.trade_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</td>
                      <td className="px-4 py-3 font-medium">{t.pair}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", t.direction === "buy" ? "text-gain" : "text-loss")}>
                          {t.direction === "buy" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {t.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className={cn("px-4 py-3 font-mono font-medium", (t.result_usd ?? 0) > 0 ? "text-gain" : (t.result_usd ?? 0) < 0 ? "text-loss" : "")}>
                        {t.result_usd != null ? `${t.result_usd > 0 ? "🟢 +" : "🔴 "}${t.result_usd.toFixed(2)} $` : "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge v={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <MotivationBanner tone={tone} />

        <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                {active?.pair} <span className={cn("text-xs px-2 py-0.5 rounded font-mono", active?.direction === "buy" ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss")}>{active?.direction.toUpperCase()}</span>
              </DialogTitle>
            </DialogHeader>
            {active && (
              <div className="space-y-5 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Detail k="Date" v={new Date(active.trade_at).toLocaleString("fr-FR")} />
                  <Detail k="Statut" v={<StatusBadge v={active.status} />} />
                  <Detail k="Résultat" v={active.result_usd != null ? `${active.result_usd > 0 ? "+" : ""}${active.result_usd.toFixed(2)} $` : "—"} className={cn((active.result_usd ?? 0) > 0 ? "text-gain" : (active.result_usd ?? 0) < 0 ? "text-loss" : "")} />
                  <Detail k="Lot" v={active.lot_size ?? "—"} />
                  <Detail k="Entrée" v={active.entry_price ?? "—"} />
                  <Detail k="Sortie" v={active.exit_price ?? "—"} />
                  <Detail k="Stop loss" v={active.stop_loss ?? "—"} />
                  <Detail k="Take profit" v={active.take_profit ?? "—"} />
                </div>

                {active.technical_comment && (
                  <Section title="Analyse technique"><p className="text-foreground/90 whitespace-pre-wrap">{active.technical_comment}</p></Section>
                )}
                {(active.news_event || active.fundamental_note) && (
                  <Section title="Fondamental">
                    {active.news_event && <p><strong>News :</strong> {active.news_event} {active.news_impact && <Badge variant="outline" className="ml-1">{active.news_impact}</Badge>}</p>}
                    {active.sentiment && <p><strong>Sentiment :</strong> {active.sentiment}</p>}
                    {active.fundamental_note && <p className="text-foreground/90 whitespace-pre-wrap mt-1">{active.fundamental_note}</p>}
                  </Section>
                )}

                {shotUrl && (
                  <Section title="Screenshot">
                    <img src={shotUrl} alt="Trade" className="rounded-lg border border-border w-full" />
                  </Section>
                )}

                {active.coach_feedback ? (
                  <Section title="💬 Feedback du coach" tone="gold">
                    <p className="text-foreground/90 whitespace-pre-wrap">{active.coach_feedback}</p>
                  </Section>
                ) : isStudent ? (
                  <div className="rounded-lg border border-dashed border-student/30 bg-student/5 p-4 text-xs text-muted-foreground italic">
                    Ce trade n'a pas encore de feedback du coach.
                  </div>
                ) : null}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

function Detail({ k, v, className }: { k: string; v: React.ReactNode; className?: string }) {
  return (
    <div className="rounded-md bg-secondary/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className={cn("font-mono text-sm font-medium mt-0.5", className)}>{v}</div>
    </div>
  );
}
function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "gold" }) {
  return (
    <div className={cn("rounded-lg p-4", tone === "gold" ? "bg-student/10 border border-student/30" : "bg-secondary/40")}>
      <div className={cn("text-[11px] uppercase tracking-[0.15em] font-mono mb-2", tone === "gold" ? "text-student" : "text-muted-foreground")}>{title}</div>
      <div className="text-sm space-y-1">{children}</div>
    </div>
  );
}
function StatusBadge({ v }: { v: TradeFull["status"] }) {
  if (!v) return <span className="text-muted-foreground">—</span>;
  if (v === "win") return <Badge className="bg-gain/15 text-gain border border-gain/30 hover:bg-gain/20">Gagnant</Badge>;
  if (v === "loss") return <Badge className="bg-loss/15 text-loss border border-loss/30 hover:bg-loss/20">Perdant</Badge>;
  return <Badge variant="secondary">BE</Badge>;
}

export default Trades;
