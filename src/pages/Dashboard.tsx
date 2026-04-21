import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { MotivationBanner } from "@/components/MotivationBanner";
import { EquityChart } from "@/components/EquityChart";
import { Plus, Lock, Loader2, GraduationCap, BookOpen, LineChart, ListChecks, MessageSquare, Target, TrendingUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Trade {
  id: string;
  trade_at: string;
  pair: string;
  direction: "buy" | "sell";
  result_usd: number | null;
  status: "win" | "loss" | "breakeven" | null;
}

const Dashboard = () => {
  const { user, profile, hasJournalAccess, isStudent, isAdmin, loading: authLoading } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingExercises, setPendingExercises] = useState(0);
  const [latestAnalysisTitle, setLatestAnalysisTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: t }, { data: subs }, { data: analysis }] = await Promise.all([
        supabase
          .from("trades")
          .select("id, trade_at, pair, direction, result_usd, status")
          .order("trade_at", { ascending: false }),
        isStudent || isAdmin
          ? supabase.from("exercise_submissions").select("id, status").eq("user_id", user.id)
          : Promise.resolve({ data: [] as any[] }),
        isStudent || isAdmin
          ? supabase.from("weekly_analyses").select("title").order("week_start", { ascending: false }).limit(1)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (t) setTrades(t as Trade[]);
      if (subs) setPendingExercises(subs.filter((s: any) => s.status !== "graded").length);
      if (analysis && analysis.length) setLatestAnalysisTitle(analysis[0].title);
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

  // Mode student-first si étudiant ou admin (admin voit la version student riche par défaut)
  const studentMode = isStudent;

  return (
    <div className="min-h-screen bg-background relative">
      <AppHeader />

      {/* Halo */}
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full blur-[120px] pointer-events-none",
        studentMode ? "bg-student/10" : "bg-primary/10"
      )} />

      <main className="container relative py-6 md:py-10 space-y-6">
        {/* GREETING */}
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono mb-2">
              {studentMode ? <GraduationCap className="h-3.5 w-3.5 text-student" /> : <LineChart className="h-3.5 w-3.5 text-primary" />}
              <span>{studentMode ? "Espace Élève" : isAdmin ? "Espace Admin" : "Espace Abonné"}</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              👋 Bienvenue, <span className={studentMode ? "text-gradient-gold" : "text-gradient-cyan"}>{profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {studentMode ? "Objectif : améliorer ta discipline" : "Objectif : mesurer ta performance"}
            </p>
          </div>
          {(hasJournalAccess || isAdmin) && (
            <Button asChild size="lg" className={cn(
              "h-11 px-5 font-semibold border-0 text-primary-foreground",
              studentMode ? "bg-gradient-gold glow-gold" : "bg-gradient-brand glow-cyan"
            )}>
              <Link to="/trades/new"><Plus className="h-4 w-4" /> Nouveau trade</Link>
            </Button>
          )}
        </div>

        {!hasJournalAccess && !isAdmin ? (
          <Card className="glass p-10 text-center">
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
        ) : studentMode ? (
          <StudentDashboard
            loading={loading} trades={trades} net={net} winRate={winRate}
            totalGain={totalGain} totalLoss={totalLoss}
            pendingExercises={pendingExercises} latestAnalysisTitle={latestAnalysisTitle}
          />
        ) : (
          <SubscriberDashboard
            loading={loading} trades={trades} net={net} winRate={winRate}
            totalGain={totalGain} totalLoss={totalLoss} wins={wins} losses={losses}
          />
        )}

        <MotivationBanner tone={studentMode ? "gold" : "cyan"} />
      </main>
    </div>
  );
};

/* ═══════════════════ STUDENT DASHBOARD ═══════════════════ */
function StudentDashboard({
  loading, trades, net, winRate, totalGain, totalLoss, pendingExercises, latestAnalysisTitle,
}: {
  loading: boolean; trades: Trade[]; net: number; winRate: number;
  totalGain: number; totalLoss: number; pendingExercises: number; latestAnalysisTitle: string | null;
}) {
  return (
    <>
      {/* HERO STAT — net result GROS */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 glass-strong relative overflow-hidden p-7">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-student/15 blur-3xl" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-3">🟢 Résultat net</div>
          <div className={cn(
            "font-mono font-bold text-5xl md:text-6xl tracking-tight leading-none",
            net > 0 ? "text-gain" : net < 0 ? "text-loss" : "text-foreground"
          )}>
            {net > 0 ? "+" : ""}{net.toFixed(2)}<span className="text-2xl text-muted-foreground ml-1">$</span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Sur {trades.length} trade{trades.length > 1 ? "s" : ""} enregistré{trades.length > 1 ? "s" : ""}
          </div>
        </Card>
        <StatTile label="📊 Win rate" value={`${winRate}%`} accent="student" />
        <StatTile label="🔁 Nombre de trades" value={trades.length} />
      </div>

      {/* GAINS / PERTES */}
      <div className="grid grid-cols-2 gap-4">
        <StatTile label="📈 Gains" value={`+${totalGain.toFixed(2)} $`} className="text-gain" />
        <StatTile label="📉 Pertes" value={`${totalLoss.toFixed(2)} $`} className="text-loss" />
      </div>

      {/* EQUITY CURVE */}
      <Card className="glass p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-student">Évolution du capital</div>
            <h3 className="font-display text-lg font-bold mt-1">Courbe d'équité</h3>
          </div>
          <Badge variant="outline" className="border-student/40 text-student">Élève</Badge>
        </div>
        {loading ? (
          <div className="h-[260px] grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <EquityChart trades={trades} tone="gold" />
        )}
      </Card>

      {/* STUDENT-ONLY MODULES */}
      <div className="grid md:grid-cols-3 gap-4">
        <ModuleCard
          to="/trades" tone="gold" icon={ListChecks}
          title="Mes trades" desc="Historique détaillé + feedback du coach par trade."
          meta={`${trades.length} trade${trades.length > 1 ? "s" : ""}`}
        />
        <ModuleCard
          to="/exercises" tone="gold" icon={BookOpen}
          title="Exercices" desc="Cas pratiques structurés. Réponds, soumets, reçois ta correction."
          meta={pendingExercises > 0 ? `${pendingExercises} à traiter` : "Tout est à jour"}
          highlight={pendingExercises > 0}
        />
        <ModuleCard
          to="/analyse" tone="gold" icon={MessageSquare}
          title="Analyse hebdo" desc="État du marché et direction probable de la semaine."
          meta={latestAnalysisTitle ?? "Aucune publiée"}
        />
      </div>

      {/* INFO MESSAGE */}
      <div className="rounded-xl border border-student/30 bg-student/5 p-4 flex items-start gap-3">
        <span className="text-lg">💡</span>
        <p className="text-sm text-foreground/90"><strong>Plus tu ajoutes de trades, plus ton analyse devient précise.</strong> Documente chaque entrée pour identifier tes patterns.</p>
      </div>
    </>
  );
}

/* ═══════════════════ SUBSCRIBER DASHBOARD ═══════════════════ */
function SubscriberDashboard({
  loading, trades, net, winRate, totalGain, totalLoss, wins, losses,
}: { loading: boolean; trades: Trade[]; net: number; winRate: number; totalGain: number; totalLoss: number; wins: number; losses: number }) {
  const profitFactor = totalLoss !== 0 ? Math.abs(totalGain / totalLoss).toFixed(2) : "—";
  return (
    <>
      <div className="grid lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="lg:col-span-2 glass-strong relative overflow-hidden p-7">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-3">P&L net</div>
          <div className={cn(
            "font-mono font-bold text-5xl md:text-6xl tracking-tight leading-none",
            net > 0 ? "text-gain" : net < 0 ? "text-loss" : "text-foreground"
          )}>
            {net > 0 ? "+" : ""}{net.toFixed(2)}<span className="text-2xl text-muted-foreground ml-1">$</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Win rate</div><div className="font-mono text-lg font-semibold text-primary">{winRate}%</div></div>
            <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">PF</div><div className="font-mono text-lg font-semibold">{profitFactor}</div></div>
            <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trades</div><div className="font-mono text-lg font-semibold">{trades.length}</div></div>
          </div>
        </Card>
        <StatTile label="Gains" value={`+${totalGain.toFixed(2)} $`} className="text-gain" />
        <StatTile label="Pertes" value={`${totalLoss.toFixed(2)} $`} className="text-loss" />
        <StatTile label="Wins" value={wins} className="text-gain" />
        <StatTile label="Losses" value={losses} className="text-loss" />
      </div>

      <Card className="glass p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-primary">Performance</div>
            <h3 className="font-display text-lg font-bold mt-1">Equity curve</h3>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">Abonné</Badge>
        </div>
        {loading ? (
          <div className="h-[260px] grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <EquityChart trades={trades} tone="cyan" />
        )}
      </Card>

      <ModuleCard to="/trades" tone="cyan" icon={ListChecks} title="Mes trades" desc="Historique complet, filtres et statistiques par paire." meta={`${trades.length} trade${trades.length > 1 ? "s" : ""}`} />
    </>
  );
}

/* ═══════════════════ HELPERS ═══════════════════ */
function StatTile({ label, value, className, accent }: { label: string; value: React.ReactNode; className?: string; accent?: "student" | "subscriber" }) {
  return (
    <Card className={cn(
      "glass p-5 relative overflow-hidden",
      accent === "student" && "ring-1 ring-student/30",
      accent === "subscriber" && "ring-1 ring-primary/30",
    )}>
      <div className="text-[11px] uppercase tracking-[0.15em] font-mono text-muted-foreground mb-2">{label}</div>
      <div className={cn("font-display text-2xl md:text-3xl font-bold", className)}>{value}</div>
    </Card>
  );
}

function ModuleCard({ to, tone, icon: Icon, title, desc, meta, highlight }: {
  to: string; tone: "gold" | "cyan"; icon: any; title: string; desc: string; meta?: string; highlight?: boolean;
}) {
  const ring = tone === "gold" ? "hover:ring-gold" : "hover:ring-cyan";
  const iconBg = tone === "gold" ? "bg-student/15 text-student border-student/30" : "bg-primary/15 text-primary border-primary/30";
  return (
    <Link to={to} className={cn("group block glass rounded-xl p-5 transition-all hover:-translate-y-0.5", ring)}>
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
    </Link>
  );
}

export default Dashboard;
