import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PAIRS, formatFCFA } from "@/lib/constants";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Plus, TrendingDown, TrendingUp, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Trade {
  id: string;
  trade_at: string;
  pair: string;
  direction: "buy" | "sell";
  result_usd: number | null;
  status: "win" | "loss" | "breakeven" | null;
  news_impact: string | null;
  sentiment: string | null;
}

const Dashboard = () => {
  const { user, profile, hasJournalAccess, isStudent, isAdmin, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairFilter, setPairFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("id, trade_at, pair, direction, result_usd, status, news_impact, sentiment")
        .order("trade_at", { ascending: false });
      if (!error && data) setTrades(data as Trade[]);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading) return null;

  const filtered = trades.filter((t) => {
    if (pairFilter !== "all" && t.pair !== pairFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search && !t.pair.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const wins = trades.filter((t) => t.status === "win").length;
  const losses = trades.filter((t) => t.status === "loss").length;
  const winRate = trades.length ? Math.round((wins / (wins + losses || 1)) * 100) : 0;
  const totalGain = trades.filter((t) => (t.result_usd ?? 0) > 0).reduce((s, t) => s + (t.result_usd ?? 0), 0);
  const totalLoss = trades.filter((t) => (t.result_usd ?? 0) < 0).reduce((s, t) => s + (t.result_usd ?? 0), 0);
  const profitFactor = totalLoss !== 0 ? Math.abs(totalGain / totalLoss).toFixed(2) : "—";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8">
        {params.get("pending") === "1" && (
          <Card className="p-4 mb-6 border-warn/40 bg-warn/5">
            <p className="text-sm">⏳ <strong>Demande de paiement enregistrée.</strong> Contacte-nous sur WhatsApp pour activer ton accès en moins de 5 minutes.</p>
          </Card>
        )}

        <div className="flex justify-between items-start gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground">Bienvenue {profile?.full_name || user?.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {hasJournalAccess || isAdmin ? (
              <Button asChild><Link to="/trades/new"><Plus className="h-4 w-4" /> Nouveau trade</Link></Button>
            ) : (
              <Button asChild><Link to="/subscribe">Activer mon accès</Link></Button>
            )}
          </div>
        </div>

        {!hasJournalAccess && !isAdmin ? (
          <Card className="p-8 text-center">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-xl font-semibold mb-2">Accès au journal verrouillé</h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Souscris à un abonnement ou rejoins la formation pour accéder au journal de trading complet.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button asChild><Link to="/subscribe">Voir les offres</Link></Button>
              <WhatsAppButton message="Bonjour, j'aimerais activer mon compte MasterLogPro." label="Aide sur WhatsApp" variant="outline" />
            </div>
          </Card>
        ) : (
          <>
            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
              <StatCard label="Win rate" value={`${winRate}%`} accent />
              <StatCard label="Trades" value={trades.length} />
              <StatCard label="Gain total" value={`${totalGain.toFixed(2)} $`} className="text-gain" />
              <StatCard label="Perte totale" value={`${totalLoss.toFixed(2)} $`} className="text-loss" />
              {(isStudent || isAdmin) && (
                <>
                  <StatCard label="Profit factor" value={profitFactor} />
                  <StatCard label="Wins" value={wins} className="text-gain" />
                  <StatCard label="Losses" value={losses} className="text-loss" />
                  <StatCard label="Result net" value={`${(totalGain + totalLoss).toFixed(2)} $`} />
                </>
              )}
            </div>

            {/* FILTERS */}
            <Card className="p-4 mb-4 shadow-card">
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

            {/* TABLE */}
            <Card className="shadow-card overflow-hidden">
              {loading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  Aucun trade encore. <Link to="/trades/new" className="text-accent underline">Ajoute ton premier trade</Link>.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/60">
                      <tr className="text-left">
                        <Th>Date</Th><Th>Paire</Th><Th>Direction</Th><Th>Résultat</Th><Th>Impact</Th><Th>Sentiment</Th><Th>Statut</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => (
                        <tr key={t.id} className="border-t hover:bg-secondary/30">
                          <Td>{new Date(t.trade_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</Td>
                          <Td className="font-medium">{t.pair}</Td>
                          <Td>
                            <span className={cn("inline-flex items-center gap-1 text-xs font-medium", t.direction === "buy" ? "text-gain" : "text-loss")}>
                              {t.direction === "buy" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {t.direction.toUpperCase()}
                            </span>
                          </Td>
                          <Td className={cn("font-mono font-medium", (t.result_usd ?? 0) > 0 ? "text-gain" : (t.result_usd ?? 0) < 0 ? "text-loss" : "")}>
                            {t.result_usd != null ? `${t.result_usd > 0 ? "+" : ""}${t.result_usd.toFixed(2)} $` : "—"}
                          </Td>
                          <Td><ImpactBadge v={t.news_impact} /></Td>
                          <Td className="capitalize text-muted-foreground">{t.sentiment ?? "—"}</Td>
                          <Td><StatusBadge v={t.status} /></Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

const Th = ({ children }: { children: React.ReactNode }) => <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</th>;
const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => <td className={cn("px-3 py-2.5", className)}>{children}</td>;

function StatCard({ label, value, className, accent }: { label: string; value: React.ReactNode; className?: string; accent?: boolean }) {
  return (
    <Card className={cn("p-4 shadow-card", accent && "border-accent/40 bg-accent/5")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-xl md:text-2xl font-bold mt-0.5", className)}>{value}</div>
    </Card>
  );
}

function StatusBadge({ v }: { v: Trade["status"] }) {
  if (!v) return <span className="text-muted-foreground">—</span>;
  if (v === "win") return <Badge className="bg-gain text-gain-foreground hover:bg-gain">Gagnant</Badge>;
  if (v === "loss") return <Badge className="bg-loss text-loss-foreground hover:bg-loss">Perdant</Badge>;
  return <Badge variant="secondary">BE</Badge>;
}

function ImpactBadge({ v }: { v: string | null }) {
  if (!v || v === "none") return <span className="text-muted-foreground text-xs">—</span>;
  const map: Record<string, string> = {
    high: "bg-loss/10 text-loss",
    medium: "bg-warn/10 text-warn",
    low: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = { high: "Fort", medium: "Moyen", low: "Faible" };
  return <span className={cn("inline-block text-xs px-2 py-0.5 rounded-full font-medium", map[v])}>{labels[v]}</span>;
}

export default Dashboard;
