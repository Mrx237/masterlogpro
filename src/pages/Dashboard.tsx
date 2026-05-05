import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { MotivationBanner } from "@/components/MotivationBanner";
import { DonutCard } from "@/components/dashboard/DonutCard";
import { EquityChart } from "@/components/EquityChart";
import {
  Plus, Lock, Loader2, GraduationCap, BookOpen, LineChart, ListChecks,
  MessageSquare, Target, TrendingUp, TrendingDown, ArrowRight, Wallet, Pencil,
  Activity, Flame, Shield, Trophy, Sparkles, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Trade {
  id: string;
  trade_at: string;
  pair: string;
  direction: "buy" | "sell";
  result_usd: number | null;
  status: "win" | "loss" | "breakeven" | null;
}

/* ═══════════════════ DONUT GRID ═══════════════════ */
function PerformanceDonuts({
  trades, totalGain, totalLoss, net, winRate, wins, losses, capital, maxRisk,
}: {
  trades: Trade[]; totalGain: number; totalLoss: number; net: number;
  winRate: number; wins: number; losses: number; capital: number; maxRisk: number;
}) {
  const closed = wins + losses;
  const perfSegs = [
    { name: "Gains", value: Math.round(totalGain * 100) / 100, color: "hsl(var(--gain))" },
    { name: "Pertes", value: Math.round(Math.abs(totalLoss) * 100) / 100, color: "hsl(var(--loss))" },
  ];
  const netStr = `${net >= 0 ? "+" : ""}${net.toFixed(2)}$`;
  const netPct = capital > 0 ? (net / capital) * 100 : 0;
  const wrSegs = [
    { name: "Wins", value: wins, color: "hsl(var(--gain))" },
    { name: "Losses", value: losses, color: "hsl(var(--loss))" },
  ];
  const wrBadge: any = closed === 0 ? null
    : winRate > 65 ? { label: "Excellent", tone: "gain" }
    : winRate >= 50 ? { label: "Stable", tone: "primary" }
    : { label: "À améliorer", tone: "loss" };
  const limitUsd = capital * (maxRisk / 100);
  const losingTrades = trades.filter((t) => (t.result_usd ?? 0) < 0);
  const disciplined = losingTrades.filter((t) => Math.abs(t.result_usd ?? 0) <= limitUsd).length;
  const undisciplined = losingTrades.length - disciplined;
  const disciplinePct = losingTrades.length > 0 ? Math.round((disciplined / losingTrades.length) * 100) : 100;
  const riskSegs = [
    { name: "Respecté", value: disciplined, color: "hsl(var(--gain))" },
    { name: "Dépassé", value: undisciplined, color: "hsl(var(--warn))" },
  ];
  const buys = trades.filter((t) => t.direction === "buy").length;
  const sells = trades.filter((t) => t.direction === "sell").length;
  const buySegs = [
    { name: "Buy", value: buys, color: "hsl(var(--gain))" },
    { name: "Sell", value: sells, color: "hsl(var(--loss))" },
  ];
  const dominant = buys === sells ? "Équilibré" : buys > sells ? "Buy" : "Sell";

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <DonutCard
        title="Performance globale" description="Gains vs pertes en USD"
        centerValue={netStr} centerLabel={`${netPct >= 0 ? "+" : ""}${netPct.toFixed(1)}%`}
        centerColorClass={net > 0 ? "text-gain" : net < 0 ? "text-loss" : "text-foreground"}
        segments={perfSegs} emptyMessage="Ajoute des trades pour voir ta performance"
      />
      <DonutCard
        title="Win rate" description="Trades gagnants vs perdants"
        centerValue={`${winRate}%`} centerLabel={`${closed} clôturé${closed > 1 ? "s" : ""}`}
        centerColorClass="text-primary" segments={wrSegs} badge={wrBadge}
        emptyMessage="En attente de trades clôturés"
      />
      <DonutCard
        title="Discipline (risque)" description={`Limite: ${maxRisk}% / trade (≈ $${limitUsd.toFixed(0)})`}
        centerValue={`${disciplinePct}%`} centerLabel="respect"
        centerColorClass={disciplinePct >= 80 ? "text-gain" : disciplinePct >= 50 ? "text-[hsl(var(--warn))]" : "text-loss"}
        segments={riskSegs}
        badge={losingTrades.length === 0 ? undefined
          : disciplinePct >= 80 ? { label: "Discipliné", tone: "gain" }
          : disciplinePct >= 50 ? { label: "Moyen", tone: "warn" }
          : { label: "À corriger", tone: "loss" }}
        emptyMessage="Aucune perte enregistrée 👌"
      />
      <DonutCard
        title="Répartition Buy / Sell" description="Direction de tes trades"
        centerValue={dominant} centerLabel={`${buys + sells} trades`}
        centerColorClass="text-foreground" segments={buySegs}
        emptyMessage="Aucun trade enregistré"
      />
    </div>
  );
}

const Dashboard = () => {
  const { user, profile, hasJournalAccess, isStudent, isAdmin, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingExercises, setPendingExercises] = useState(0);
  const [latestAnalysisTitle, setLatestAnalysisTitle] = useState<string | null>(null);
  const [initialCapital, setInitialCapital] = useState<number>(1000);
  const [maxRisk, setMaxRisk] = useState<number>(2);
  const [editingCapital, setEditingCapital] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: t }, { data: subs }, { data: analysis }, { data: prof }] = await Promise.all([
        supabase.from("trades").select("id, trade_at, pair, direction, result_usd, status").order("trade_at", { ascending: false }),
        isStudent || isAdmin
          ? supabase.from("exercise_submissions").select("id, status").eq("user_id", user.id)
          : Promise.resolve({ data: [] as any[] }),
        isStudent || isAdmin
          ? supabase.from("weekly_analyses").select("title").order("week_start", { ascending: false }).limit(1)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("profiles").select("initial_capital, max_risk_per_trade").eq("id", user.id).maybeSingle(),
      ]);
      if (t) setTrades(t as Trade[]);
      if (subs) setPendingExercises(subs.filter((s: any) => s.status !== "graded").length);
      if (analysis && analysis.length) setLatestAnalysisTitle(analysis[0].title);
      if (prof?.initial_capital != null) setInitialCapital(Number(prof.initial_capital));
      if ((prof as any)?.max_risk_per_trade != null) setMaxRisk(Number((prof as any).max_risk_per_trade));
      setLoading(false);
    })();
  }, [user, isStudent, isAdmin]);

  if (authLoading) return null;

  const wins = trades.filter((t) => t.status === "win").length;
  const losses = trades.filter((t) => t.status === "loss").length;
  const closed = wins + losses;
  const winRate = closed ? Math.round((wins / closed) * 100) : 0;
  const totalGain = trades.filter((t) => (t.result_usd ?? 0) > 0).reduce((s, t) => s + (t.result_usd ?? 0), 0);
  const totalLoss = trades.filter((t) => (t.result_usd ?? 0) < 0).reduce((s, t) => s + (t.result_usd ?? 0), 0);
  const net = totalGain + totalLoss;
  const currentCapital = initialCapital + net;
  const capitalPct = initialCapital > 0 ? (net / initialCapital) * 100 : 0;
  const studentMode = isStudent;
  const tone: "gold" | "cyan" = studentMode ? "gold" : "cyan";

  // Streak (consecutive wins from most recent closed trade backwards)
  const closedSorted = useMemo(
    () => [...trades]
      .filter((t) => t.status === "win" || t.status === "loss")
      .sort((a, b) => new Date(b.trade_at).getTime() - new Date(a.trade_at).getTime()),
    [trades],
  );
  let streak = 0; let streakKind: "win" | "loss" | null = null;
  for (const t of closedSorted) {
    if (streakKind === null) { streakKind = t.status as any; streak = 1; }
    else if (t.status === streakKind) streak++;
    else break;
  }

  // Best pair
  const pairAgg = new Map<string, number>();
  trades.forEach((t) => pairAgg.set(t.pair, (pairAgg.get(t.pair) ?? 0) + (t.result_usd ?? 0)));
  const bestPair = Array.from(pairAgg.entries()).sort((a, b) => b[1] - a[1])[0];

  // Avg R-multiple proxy: avg gain vs avg loss
  const avgWin = wins ? totalGain / wins : 0;
  const avgLoss = losses ? Math.abs(totalLoss) / losses : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins) / (avgLoss * losses || 1) : wins > 0 ? Infinity : 0;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AppHeader />

      {/* Aurora backdrop */}
      <div className="absolute inset-x-0 top-0 h-[520px] pointer-events-none overflow-hidden">
        <div className={cn(
          "absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[1100px] rounded-[100%] blur-[140px] opacity-60",
          studentMode ? "bg-student/20" : "bg-primary/20",
        )} />
        <div className="absolute top-20 right-10 h-[300px] w-[300px] rounded-full bg-accent/15 blur-[120px]" />
        <div className="absolute inset-0 grid-bg opacity-[0.35]" />
      </div>

      <main className="container relative py-6 md:py-10 space-y-6 max-w-6xl">
        {/* ═══════ HERO ═══════ */}
        <section className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full glass-subtle text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
                {studentMode
                  ? <><GraduationCap className="h-3 w-3 text-student" /> Espace Élève</>
                  : isAdmin
                    ? <><Shield className="h-3 w-3 text-accent" /> Espace Admin</>
                    : <><LineChart className="h-3 w-3 text-primary" /> Espace Abonné</>}
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span className="text-foreground/60">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-bold leading-[1.05]">
                Bonjour, <span className={studentMode ? "text-gradient-gold" : "text-gradient-cyan"}>
                  {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}
                </span>
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 max-w-md">
                <Target className="h-3.5 w-3.5 shrink-0" />
                {studentMode ? "Garde le cap : la discipline construit le capital." : "Mesure, ajuste, performe — chaque trade compte."}
              </p>
            </div>
            {(hasJournalAccess || isAdmin) && (
              <Button asChild size="lg" className={cn(
                "h-12 px-6 font-semibold border-0 text-primary-foreground rounded-xl group relative overflow-hidden",
                studentMode ? "bg-gradient-gold glow-gold" : "bg-gradient-brand glow-cyan",
              )}>
                <Link to="/trades/new">
                  <Plus className="h-4 w-4" /> Nouveau trade
                  <span className="absolute inset-0 animate-shine" />
                </Link>
              </Button>
            )}
          </div>
        </section>

        {!hasJournalAccess && !isAdmin ? (
          <Card className="glass-strong p-10 text-center rounded-2xl">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-display text-xl font-bold mb-2">Accès au journal verrouillé</h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Souscris à un abonnement ou rejoins la formation pour accéder au journal complet.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button asChild className="bg-gradient-brand text-primary-foreground border-0"><Link to="/subscribe">Voir les offres</Link></Button>
              <WhatsAppButton message="Bonjour, j'aimerais activer mon compte MasterLogPro." label="Aide WhatsApp" variant="outline" />
            </div>
          </Card>
        ) : (
          <>
            {/* ═══════ HERO STAT BAND ═══════ */}
            <HeroStatBand
              tone={tone}
              currentCapital={currentCapital}
              initialCapital={initialCapital}
              capitalPct={capitalPct}
              net={net}
              winRate={winRate}
              closed={closed}
              tradesCount={trades.length}
              streak={streak}
              streakKind={streakKind}
              profitFactor={profitFactor}
              onEditCapital={() => setEditingCapital(true)}
            />

            {/* ═══════ EQUITY ═══════ */}
            <Card className="glass-strong rounded-2xl p-5 md:p-6 relative overflow-hidden">
              <div className={cn(
                "absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl",
                tone === "gold" ? "bg-student/15" : "bg-primary/15",
              )} />
              <div className="relative flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3 w-3" /> Courbe d'équité
                  </div>
                  <h3 className="font-display text-lg font-bold mt-1">Évolution du capital</h3>
                </div>
                {bestPair && bestPair[1] > 0 && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass-subtle">
                    <Trophy className="h-3.5 w-3.5 text-[hsl(var(--warn))]" />
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Top paire</span>
                    <span className="text-xs font-semibold">{bestPair[0]}</span>
                    <span className="text-xs font-mono text-gain">+${bestPair[1].toFixed(0)}</span>
                  </div>
                )}
              </div>
              <EquityChart trades={trades} tone={tone} />
            </Card>

            {/* ═══════ DONUTS ═══════ */}
            {loading ? (
              <Card className="glass p-10 grid place-items-center rounded-2xl">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </Card>
            ) : (
              <PerformanceDonuts
                trades={trades} totalGain={totalGain} totalLoss={totalLoss}
                net={net} winRate={winRate} wins={wins} losses={losses}
                capital={initialCapital} maxRisk={maxRisk}
              />
            )}

            {/* ═══════ MODULES ═══════ */}
            {studentMode ? (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <ModuleCard
                    to="/trades" tone="gold" icon={ListChecks}
                    title="Mes trades" desc="Historique détaillé + feedback du coach par trade."
                    meta={`${trades.length} trade${trades.length > 1 ? "s" : ""}`}
                  />
                  <ModuleCard
                    to="/exercises" tone="gold" icon={BookOpen}
                    title="Exercices" desc="Cas pratiques structurés. Soumets, reçois ta correction."
                    meta={pendingExercises > 0 ? `${pendingExercises} à traiter` : "Tout est à jour"}
                    highlight={pendingExercises > 0}
                  />
                  <ModuleCard
                    to="/analyse" tone="gold" icon={MessageSquare}
                    title="Analyse hebdo" desc="État du marché et direction probable de la semaine."
                    meta={latestAnalysisTitle ?? "Aucune publiée"}
                  />
                </div>
                <ProTip tone="gold" text="Plus tu ajoutes de trades, plus ton analyse devient précise. Documente chaque entrée pour identifier tes patterns." />
              </>
            ) : (
              <>
                <ModuleCard
                  to="/trades" tone="cyan" icon={ListChecks}
                  title="Mes trades" desc="Historique complet, filtres et statistiques par paire."
                  meta={`${trades.length} trade${trades.length > 1 ? "s" : ""}`}
                />
                <ProTip tone="cyan" text="Un trader pro documente chaque trade. Les chiffres ne mentent jamais." />
              </>
            )}
          </>
        )}

        <MotivationBanner tone={tone} />
      </main>

      <CapitalDialog
        open={editingCapital}
        initial={initialCapital}
        userId={user?.id ?? ""}
        onClose={() => setEditingCapital(false)}
        onSaved={(v) => setInitialCapital(v)}
      />
    </div>
  );
};

/* ═══════════════════ HERO STAT BAND ═══════════════════ */
function HeroStatBand({
  tone, currentCapital, initialCapital, capitalPct, net,
  winRate, closed, tradesCount, streak, streakKind, profitFactor, onEditCapital,
}: {
  tone: "gold" | "cyan";
  currentCapital: number; initialCapital: number; capitalPct: number; net: number;
  winRate: number; closed: number; tradesCount: number;
  streak: number; streakKind: "win" | "loss" | null; profitFactor: number;
  onEditCapital: () => void;
}) {
  const positive = capitalPct >= 0;
  const accent = tone === "gold" ? "student" : "primary";
  const accentText = tone === "gold" ? "text-student" : "text-primary";
  const accentRing = tone === "gold" ? "ring-gold" : "ring-cyan";
  const grad = tone === "gold" ? "bg-gradient-gold" : "bg-gradient-brand";

  const pf = !isFinite(profitFactor) ? "∞" : profitFactor > 0 ? profitFactor.toFixed(2) : "—";

  return (
    <Card className={cn("glass-strong relative overflow-hidden rounded-2xl p-5 md:p-7", accentRing)}>
      {/* Aurora */}
      <div className={cn("absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl opacity-50",
        tone === "gold" ? "bg-student/30" : "bg-primary/30")} />
      <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute inset-0 noise opacity-50" />

      <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-8 items-center">
        {/* CAPITAL HERO */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("grid h-9 w-9 place-items-center rounded-xl border", `border-${accent}/30`, `bg-${accent}/15`, accentText)}>
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <div className={cn("text-[10px] uppercase tracking-[0.2em] font-mono", accentText)}>Capital actif</div>
                <div className="text-[11px] text-muted-foreground">Initial · ${initialCapital.toFixed(2)}</div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onEditCapital} className="h-8 gap-1.5 rounded-lg">
              <Pencil className="h-3 w-3" />
              <span className="text-xs">Modifier</span>
            </Button>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div className="font-mono font-extrabold text-4xl md:text-6xl tracking-tight leading-none">
              ${currentCapital.toFixed(2)}
            </div>
            <div className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-mono text-sm font-semibold",
              positive ? "bg-gain/10 border-gain/30 text-gain" : "bg-loss/10 border-loss/30 text-loss",
            )}>
              {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {positive ? "+" : ""}{capitalPct.toFixed(2)}%
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2.5 w-full rounded-full bg-secondary/50 overflow-hidden relative">
              <div className={cn("h-full transition-all relative", grad)} style={{ width: `${Math.min(Math.abs(capitalPct), 100)}%` }}>
                <span className="absolute inset-0 animate-shine" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
              <span>P&L net : <span className={cn("font-mono font-semibold", net >= 0 ? "text-gain" : "text-loss")}>{net >= 0 ? "+" : ""}${net.toFixed(2)}</span></span>
              <span className="font-mono">{tradesCount} trade{tradesCount > 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* MICRO STATS */}
        <div className="grid grid-cols-2 gap-3">
          <MicroStat
            icon={Zap}
            label="Win rate"
            value={closed ? `${winRate}%` : "—"}
            sub={closed ? `${closed} clôturé${closed > 1 ? "s" : ""}` : "Aucun"}
            valueClass={closed && winRate >= 50 ? "text-gain" : closed ? "text-loss" : "text-foreground"}
          />
          <MicroStat
            icon={Sparkles}
            label="Profit factor"
            value={pf}
            sub="Gains / pertes"
            valueClass={!isFinite(profitFactor) || profitFactor >= 1.5 ? "text-gain" : profitFactor >= 1 ? "text-foreground" : profitFactor > 0 ? "text-loss" : "text-foreground"}
          />
          <MicroStat
            icon={Flame}
            label="Série actuelle"
            value={streak > 0 ? `${streak}` : "0"}
            sub={streakKind === "win" ? "wins consécutifs" : streakKind === "loss" ? "pertes consécutives" : "—"}
            valueClass={streakKind === "win" ? "text-gain" : streakKind === "loss" ? "text-loss" : "text-foreground"}
          />
          <MicroStat
            icon={Shield}
            label="Discipline"
            value={closed ? `${winRate >= 50 ? "On" : "Off"}` : "—"}
            sub="Mindset trader"
            valueClass={accentText}
          />
        </div>
      </div>
    </Card>
  );
}

function MicroStat({ icon: Icon, label, value, sub, valueClass }: {
  icon: any; label: string; value: string; sub: string; valueClass?: string;
}) {
  return (
    <div className="glass-subtle rounded-xl p-3 relative overflow-hidden group hover:border-foreground/20 transition-colors">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={cn("font-mono font-bold text-lg md:text-xl leading-none", valueClass)}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1 truncate">{sub}</div>
    </div>
  );
}

/* ═══════════════════ MODULE CARD ═══════════════════ */
function ModuleCard({ to, tone, icon: Icon, title, desc, meta, highlight }: {
  to: string; tone: "gold" | "cyan"; icon: any; title: string; desc: string; meta?: string; highlight?: boolean;
}) {
  const ring = tone === "gold" ? "hover:ring-gold" : "hover:ring-cyan";
  const iconBg = tone === "gold" ? "bg-student/15 text-student border-student/30" : "bg-primary/15 text-primary border-primary/30";
  return (
    <Link to={to} className={cn(
      "group block glass rounded-2xl p-5 transition-all hover:-translate-y-0.5 relative overflow-hidden",
      ring,
    )}>
      <div className={cn(
        "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity",
        tone === "gold" ? "bg-student/30" : "bg-primary/30",
      )} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("grid h-11 w-11 place-items-center rounded-xl border", iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
        <h3 className="font-display text-lg font-bold mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{desc}</p>
        {meta && (
          <div className={cn("text-[11px] font-mono uppercase tracking-wider", highlight ? "text-student" : "text-muted-foreground")}>
            {highlight && "● "}{meta}
          </div>
        )}
      </div>
    </Link>
  );
}

function ProTip({ tone, text }: { tone: "gold" | "cyan"; text: string }) {
  const cls = tone === "gold" ? "border-student/30 bg-student/5" : "border-primary/30 bg-primary/5";
  return (
    <div className={cn("rounded-2xl border p-4 flex items-start gap-3", cls)}>
      <span className="text-lg">💡</span>
      <p className="text-sm text-foreground/90">{text}</p>
    </div>
  );
}

/* ═══════════════════ CAPITAL DIALOG ═══════════════════ */
function CapitalDialog({ open, initial, userId, onClose, onSaved }: {
  open: boolean; initial: number; userId: string; onClose: () => void; onSaved: (v: number) => void;
}) {
  const [val, setVal] = useState<string>(String(initial));
  const [busy, setBusy] = useState(false);

  useEffect(() => { setVal(String(initial)); }, [initial, open]);

  async function save() {
    const n = parseFloat(val);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Entre un montant valide (> 0)");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ initial_capital: n } as any).eq("id", userId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Capital initial mis à jour");
    onSaved(n);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Capital initial</DialogTitle>
          <DialogDescription>Sert à calculer ton % de progression (ex : +2% / -5%).</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Montant en USD</Label>
          <Input type="number" min="1" step="any" value={val} onChange={(e) => setVal(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Dashboard;
