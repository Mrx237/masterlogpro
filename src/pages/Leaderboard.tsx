import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { COUNTRIES, CONTINENT_LABELS, listSubRegions, type Continent } from "@/lib/countries";
import {
  Trophy, Medal, ShieldCheck, AlertTriangle, Loader2, RefreshCw, Crown,
  Target, Globe2, MapPin, Flag, Users, TrendingUp, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Scope = "global" | "continent" | "subregion" | "country";

interface LeaderboardRow {
  user_id: string;
  total_score: number;
  total_profit_usd: number;
  profit_pct: number;
  win_rate: number;
  risk_score: number;
  consistency_score: number;
  total_trades: number;
  rank_label: string;
  global_rank: number | null;
  continent_rank: number | null;
  country_rank: number | null;
  is_suspicious: boolean;
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    country_code: string | null;
    country_name: string | null;
    continent: string | null;
    sub_region: string | null;
    is_verified: boolean;
    is_flagged: boolean;
  } | null;
}

const PAGE_SIZE = 50;

function rankTone(label: string) {
  switch (label) {
    case "Master Trader": return { badge: "bg-gradient-to-r from-amber-400 to-rose-500 text-background border-0", text: "text-amber-400" };
    case "Elite Trader":  return { badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-background border-0", text: "text-violet-400" };
    case "Pro Trader":    return { badge: "bg-primary/15 text-primary border border-primary/30", text: "text-primary" };
    case "Trader":        return { badge: "bg-secondary text-foreground border border-border/50", text: "text-foreground" };
    default:              return { badge: "bg-muted text-muted-foreground border border-border/50", text: "text-muted-foreground" };
  }
}

function initials(name?: string | null, fallback?: string | null) {
  const s = (name || fallback || "?").trim();
  const parts = s.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || s.slice(0, 2).toUpperCase();
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("global");
  const [continent, setContinent] = useState<Continent>("Africa");
  const [subRegion, setSubRegion] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("CM");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSubRegion(listSubRegions(continent)[0] ?? "");
  }, [continent]);

  const seasonMonth = useMemo(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("trader_monthly_stats")
      .select(`
        user_id,total_score,total_profit_usd,profit_pct,win_rate,risk_score,consistency_score,
        total_trades,rank_label,global_rank,continent_rank,country_rank,is_suspicious,
        profile:profiles!trader_monthly_stats_user_id_fkey(
          id,username,full_name,avatar_url,country_code,country_name,continent,sub_region,is_verified,is_flagged
        )
      `)
      .eq("season_month", seasonMonth)
      .order("total_score", { ascending: false })
      .limit(1000);

    if (error) {
      console.error(error);
      toast.error("Impossible de charger le classement");
      setLoading(false);
      return;
    }
    setRows((data as any[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [seasonMonth]);

  async function refresh() {
    setRefreshing(true);
    const { error } = await supabase.rpc("refresh_leaderboard");
    setRefreshing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Classement recalculé");
    load();
  }

  const filtered = useMemo(() => {
    let out = rows.filter((r) => r.profile && r.profile.id);
    if (verifiedOnly) out = out.filter((r) => r.profile!.is_verified && !r.profile!.is_flagged);
    if (scope === "continent")  out = out.filter((r) => r.profile!.continent === continent);
    if (scope === "subregion")  out = out.filter((r) => r.profile!.sub_region === subRegion);
    if (scope === "country")    out = out.filter((r) => r.profile!.country_code === countryCode);
    return out;
  }, [rows, scope, continent, subRegion, countryCode, verifiedOnly]);

  const ranked = useMemo(() =>
    filtered.map((r, i) => ({ ...r, displayRank: i + 1 })),
    [filtered]
  );

  const visible = ranked.slice(0, page * PAGE_SIZE);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const restVisible = rest.slice(0, page * PAGE_SIZE);

  const myRow = useMemo(() => user ? rows.find((r) => r.user_id === user.id) : null, [rows, user]);
  const myRanks = useMemo(() => {
    if (!myRow || !myRow.profile) return null;
    const inContinent = rows.filter((r) => r.profile?.continent === myRow.profile!.continent).findIndex((r) => r.user_id === user!.id) + 1;
    const inCountry   = rows.filter((r) => r.profile?.country_code === myRow.profile!.country_code).findIndex((r) => r.user_id === user!.id) + 1;
    const inGlobal    = rows.findIndex((r) => r.user_id === user!.id) + 1;
    return { inGlobal, inContinent, inCountry };
  }, [rows, myRow, user]);

  // Summary metrics
  const summary = useMemo(() => {
    const total = ranked.length;
    const verified = ranked.filter((r) => r.profile?.is_verified).length;
    const avgScore = total ? ranked.reduce((s, r) => s + r.total_score, 0) / total : 0;
    const top = ranked[0];
    return { total, verified, avgScore, top };
  }, [ranked]);

  const seasonLabel = new Date(seasonMonth).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden noise">
      <AppHeader />
      <div className="absolute top-0 right-0 h-[500px] w-[700px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-40 -left-40 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <main className="container relative py-6 md:py-10 max-w-6xl">
        {/* ─── HEADER ─── */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-mono mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Saison · {seasonLabel}
        </div>
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tight">
              Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Classement officiel des traders MasterLogPro · reset le 1<sup>er</sup> du mois.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="gap-2 border-primary/30 hover:bg-primary/10 hover:text-primary">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Recalculer
          </Button>
        </div>

        {/* ─── SUMMARY STRIP ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
          <SummaryCell icon={<Users className="h-3.5 w-3.5" />} label="Traders classés" value={summary.total.toString()} />
          <SummaryCell icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Vérifiés" value={summary.verified.toString()} />
          <SummaryCell icon={<TrendingUp className="h-3.5 w-3.5" />} label="Score moyen" value={summary.avgScore.toFixed(1)} />
          <SummaryCell icon={<Crown className="h-3.5 w-3.5" />} label="Leader" value={summary.top?.profile?.username || summary.top?.profile?.full_name || "—"} truncate />
        </div>

        {/* ─── MY POSITION ─── */}
        {user && myRow && myRanks && (
          <Card className="glass-strong p-4 md:p-5 mb-5 border border-primary/30 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-[200px] w-[200px] rounded-full bg-primary/15 blur-[80px]" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-mono">
                  <Target className="h-3 w-3" /> Ta position cette saison
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[10px]", rankTone(myRow.rank_label).badge)}>{myRow.rank_label}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    Score <span className="text-foreground font-bold">{myRow.total_score.toFixed(1)}</span>/100
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <PosCell icon={<Globe2 className="h-3 w-3" />} label="Global" value={myRanks.inGlobal} />
                <PosCell icon={<MapPin className="h-3 w-3" />} label={myRow.profile?.continent ?? "—"} value={myRanks.inContinent} />
                <PosCell icon={<Flag className="h-3 w-3" />} label={myRow.profile?.country_name ?? "—"} value={myRanks.inCountry} />
              </div>
            </div>
          </Card>
        )}

        {/* ─── FILTERS ─── */}
        <Card className="glass p-3 md:p-4 mb-5 space-y-3">
          <Tabs value={scope} onValueChange={(v) => { setScope(v as Scope); setPage(1); }}>
            <TabsList className="grid grid-cols-4 w-full bg-background/50 h-auto p-1">
              <TabsTrigger value="global"    className="text-xs gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Globe2 className="h-3 w-3" /> <span className="hidden sm:inline">Global</span>
              </TabsTrigger>
              <TabsTrigger value="continent" className="text-xs gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <MapPin className="h-3 w-3" /> <span className="hidden sm:inline">Continent</span>
              </TabsTrigger>
              <TabsTrigger value="subregion" className="text-xs gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Sparkles className="h-3 w-3" /> <span className="hidden sm:inline">Région</span>
              </TabsTrigger>
              <TabsTrigger value="country"   className="text-xs gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <Flag className="h-3 w-3" /> <span className="hidden sm:inline">Pays</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {(scope === "continent" || scope === "subregion") && (
                <Select value={continent} onValueChange={(v) => setContinent(v as Continent)}>
                  <SelectTrigger className="h-9 w-[180px] bg-background/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CONTINENT_LABELS) as Continent[]).map((c) => (
                      <SelectItem key={c} value={c}>{CONTINENT_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {scope === "subregion" && (
                <Select value={subRegion} onValueChange={setSubRegion}>
                  <SelectTrigger className="h-9 w-[200px] bg-background/40"><SelectValue placeholder="Sous-région" /></SelectTrigger>
                  <SelectContent>
                    {listSubRegions(continent).map((sr) => <SelectItem key={sr} value={sr}>{sr}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {scope === "country" && (
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="h-9 w-[220px] bg-background/40"><SelectValue placeholder="Pays" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch id="verified-only" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
              <Label htmlFor="verified-only" className="text-xs text-muted-foreground cursor-pointer">
                <ShieldCheck className="inline h-3 w-3 mr-1" /> Comptes vérifiés uniquement
              </Label>
            </div>
          </div>
        </Card>

        {/* ─── LOADING / EMPTY ─── */}
        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : ranked.length === 0 ? (
          <Card className="glass p-10 text-center">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Aucun trader classé pour cette sélection ce mois-ci.</p>
          </Card>
        ) : (
          <>
            {/* ─── PODIUM ─── */}
            {top3.length > 0 && <Podium top3={top3} myId={user?.id} />}

            {/* ─── TABLE ─── */}
            {restVisible.length > 0 && (
              <Card className="glass overflow-hidden mt-5">
                <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
                    Classement complet
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {ranked.length} trader{ranked.length > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-background/40 border-b border-border/50">
                      <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="text-left p-3 w-14">Rang</th>
                        <th className="text-left p-3">Trader</th>
                        <th className="text-left p-3 hidden sm:table-cell">Pays</th>
                        <th className="text-right p-3">Score</th>
                        <th className="text-right p-3 hidden md:table-cell">Profit %</th>
                        <th className="text-right p-3 hidden md:table-cell">Win rate</th>
                        <th className="text-right p-3 hidden lg:table-cell">Trades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restVisible.map((r) => {
                        const isMe = user?.id === r.user_id;
                        const country = COUNTRIES.find((c) => c.code === r.profile?.country_code);
                        const tone = rankTone(r.rank_label);
                        return (
                          <tr key={r.user_id} className={cn(
                            "border-b border-border/20 transition-colors hover:bg-secondary/30",
                            isMe && "bg-primary/5 ring-1 ring-inset ring-primary/30"
                          )}>
                            <td className="p-3">
                              <div className="font-mono text-xs text-muted-foreground tabular-nums w-7 text-center">
                                #{r.displayRank}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-9 w-9 border border-border/50">
                                  {r.profile?.avatar_url && <AvatarImage src={r.profile.avatar_url} />}
                                  <AvatarFallback className="text-[10px] bg-gradient-to-br from-secondary to-background font-semibold">
                                    {initials(r.profile?.username, r.profile?.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold truncate max-w-[140px]">
                                      {r.profile?.username || r.profile?.full_name || "Anonyme"}
                                    </span>
                                    {isMe && <Badge className="text-[8px] px-1 py-0 h-4 bg-primary/20 text-primary border border-primary/40">Toi</Badge>}
                                    {r.profile?.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                                    {r.is_suspicious && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                                  </div>
                                  <div className={cn("text-[10px] font-mono uppercase tracking-wider mt-0.5", tone.text)}>
                                    {r.rank_label}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 hidden sm:table-cell text-xs text-muted-foreground">
                              {country ? <span>{country.flag} {country.name}</span> : "—"}
                            </td>
                            <td className="p-3 text-right">
                              <ScoreBar value={r.total_score} />
                            </td>
                            <td className="p-3 text-right hidden md:table-cell font-mono text-xs">
                              <span className={r.profit_pct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                {r.profit_pct >= 0 ? "+" : ""}{r.profit_pct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3 text-right hidden md:table-cell font-mono text-xs">{r.win_rate.toFixed(0)}%</td>
                            <td className="p-3 text-right hidden lg:table-cell font-mono text-xs text-muted-foreground">{r.total_trades}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {rest.length > restVisible.length && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => setPage(page + 1)} className="gap-2 border-primary/30 hover:bg-primary/10 hover:text-primary">
                  Voir plus ({rest.length - restVisible.length} restants)
                </Button>
              </div>
            )}
          </>
        )}

        {!user && (
          <Card className="glass-strong p-6 mt-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-aurora opacity-10" />
            <div className="relative">
              <Trophy className="h-8 w-8 mx-auto text-primary mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Crée ton compte pour entrer dans le classement.</p>
              <Button asChild className="bg-gradient-brand text-primary-foreground border-0">
                <Link to="/auth?mode=signup">Rejoindre le leaderboard →</Link>
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

/* ──────────────────────────── Subcomponents ──────────────────────────── */

function SummaryCell({ icon, label, value, truncate }: { icon: React.ReactNode; label: string; value: string; truncate?: boolean }) {
  return (
    <div className="glass rounded-xl px-3 py-2.5 border border-border/40">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-mono">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("font-display text-lg md:text-xl font-bold mt-0.5 tabular-nums", truncate && "truncate")}>
        {value}
      </div>
    </div>
  );
}

function PosCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-background/50 border border-border/40 rounded-lg p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-mono truncate">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="font-display text-2xl font-bold mt-1 tabular-nums">#{value || "—"}</div>
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="inline-flex flex-col items-end gap-1 min-w-[80px]">
      <div className="font-display font-bold text-base tabular-nums">{value.toFixed(1)}</div>
      <div className="h-1 w-16 bg-border/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Podium({ top3, myId }: { top3: (LeaderboardRow & { displayRank: number })[]; myId?: string }) {
  // Reorder: 2nd, 1st, 3rd for the classic podium layout (desktop)
  const second = top3[1];
  const first = top3[0];
  const third = top3[2];
  const ordered = [second, first, third].filter(Boolean) as (LeaderboardRow & { displayRank: number })[];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
      {ordered.map((r) => (
        <PodiumCard key={r.user_id} row={r} isMe={r.user_id === myId} />
      ))}
    </div>
  );
}

function PodiumCard({ row, isMe }: { row: LeaderboardRow & { displayRank: number }; isMe?: boolean }) {
  const country = COUNTRIES.find((c) => c.code === row.profile?.country_code);
  const r = row.displayRank;
  const config =
    r === 1
      ? { wrap: "from-amber-400/20 via-amber-400/5 to-transparent border-amber-400/50 md:scale-[1.04] md:-translate-y-2", icon: <Crown className="h-5 w-5 text-amber-400" />, label: "Champion", ring: "ring-2 ring-amber-400/60" }
      : r === 2
      ? { wrap: "from-zinc-300/15 via-zinc-300/5 to-transparent border-zinc-300/40", icon: <Trophy className="h-4 w-4 text-zinc-300" />, label: "Vice-champion", ring: "ring-1 ring-zinc-300/40" }
      : { wrap: "from-orange-400/15 via-orange-400/5 to-transparent border-orange-400/40", icon: <Medal className="h-4 w-4 text-orange-400" />, label: "3ᵉ place", ring: "ring-1 ring-orange-400/40" };

  const tone = rankTone(row.rank_label);

  return (
    <Card className={cn(
      "relative overflow-hidden border bg-gradient-to-br p-5 transition-all hover:-translate-y-0.5",
      config.wrap,
      isMe && "ring-2 ring-primary/60"
    )}>
      {/* rank ribbon */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {config.icon}
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{config.label}</span>
      </div>

      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-3">#{r}</div>

      <div className="flex items-center gap-3">
        <Avatar className={cn("h-14 w-14 border-2 border-border/50", config.ring)}>
          {row.profile?.avatar_url && <AvatarImage src={row.profile.avatar_url} />}
          <AvatarFallback className="bg-gradient-to-br from-secondary to-background font-semibold">
            {initials(row.profile?.username, row.profile?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="font-display font-bold truncate text-base">
              {row.profile?.username || row.profile?.full_name || "Anonyme"}
            </div>
            {row.profile?.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {country ? `${country.flag} ${country.name}` : "—"}
          </div>
          <Badge className={cn("text-[9px] mt-1 px-1.5 py-0 h-4", tone.badge)}>{row.rank_label}</Badge>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-3 gap-2 text-center">
        <PodiumStat label="Score" value={row.total_score.toFixed(1)} highlight />
        <PodiumStat
          label="Profit"
          value={`${row.profit_pct >= 0 ? "+" : ""}${row.profit_pct.toFixed(1)}%`}
          tone={row.profit_pct >= 0 ? "pos" : "neg"}
        />
        <PodiumStat label="Win" value={`${row.win_rate.toFixed(0)}%`} />
      </div>
    </Card>
  );
}

function PodiumStat({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone?: "pos" | "neg" }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={cn(
        "font-display font-bold tabular-nums",
        highlight ? "text-xl" : "text-sm",
        tone === "pos" && "text-emerald-400",
        tone === "neg" && "text-rose-400"
      )}>
        {value}
      </div>
    </div>
  );
}
