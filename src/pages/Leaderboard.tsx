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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { COUNTRIES, CONTINENT_LABELS, listSubRegions, type Continent } from "@/lib/countries";
import { Trophy, Medal, ShieldCheck, AlertTriangle, Loader2, RefreshCw, Crown, Target, Activity } from "lucide-react";
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

const PAGE_SIZE = 100;

function rankColor(label: string) {
  switch (label) {
    case "Master Trader": return "bg-gradient-to-r from-amber-400 to-rose-500 text-background";
    case "Elite Trader":  return "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-background";
    case "Pro Trader":    return "bg-primary/15 text-primary border border-primary/30";
    case "Trader":        return "bg-secondary text-foreground";
    default:              return "bg-muted text-muted-foreground";
  }
}

function podiumIcon(rank: number) {
  if (rank === 1) return <Crown className="h-4 w-4 text-amber-400" />;
  if (rank === 2) return <Trophy className="h-4 w-4 text-zinc-300" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-orange-400" />;
  return <span className="font-mono text-xs text-muted-foreground">#{rank}</span>;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("global");
  const [continent, setContinent] = useState<Continent>("Africa");
  const [subRegion, setSubRegion] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("CM");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
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

  const myRow = useMemo(() => user ? rows.find((r) => r.user_id === user.id) : null, [rows, user]);
  const myRanks = useMemo(() => {
    if (!myRow || !myRow.profile) return null;
    const inContinent = rows.filter((r) => r.profile?.continent === myRow.profile!.continent).findIndex((r) => r.user_id === user!.id) + 1;
    const inCountry   = rows.filter((r) => r.profile?.country_code === myRow.profile!.country_code).findIndex((r) => r.user_id === user!.id) + 1;
    const inGlobal    = rows.findIndex((r) => r.user_id === user!.id) + 1;
    return { inGlobal, inContinent, inCountry };
  }, [rows, myRow, user]);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AppHeader />
      <div className="absolute top-0 right-0 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <main className="container relative py-6 md:py-10 max-w-6xl">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-mono mb-2">
          <Trophy className="h-3 w-3" /> Classement saison
        </div>
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="font-display text-2xl md:text-4xl font-bold mb-2">Leaderboard MasterLogPro</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              🏆 Saison du {new Date(seasonMonth).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} · reset le 1er du mois.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Recalculer
          </Button>
        </div>

        {/* Compare my rank */}
        {user && myRow && myRanks && (
          <Card className="glass p-4 md:p-5 mb-5 border border-primary/30">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-mono mb-3">
              <Target className="h-3 w-3" /> Ta position cette saison
            </div>
            <div className="grid grid-cols-3 gap-3">
              <PosCell label="Global" value={myRanks.inGlobal} />
              <PosCell label={myRow.profile?.continent ?? "—"} value={myRanks.inContinent} />
              <PosCell label={myRow.profile?.country_name ?? "—"} value={myRanks.inCountry} />
            </div>
            <div className="flex items-center gap-3 mt-4 text-xs">
              <Badge className={cn("text-[10px]", rankColor(myRow.rank_label))}>{myRow.rank_label}</Badge>
              <span className="font-mono text-muted-foreground">Score : <span className="text-foreground">{myRow.total_score.toFixed(1)}</span> / 100</span>
            </div>
          </Card>
        )}

        {/* Scope tabs */}
        <Card className="glass p-3 md:p-4 mb-5 space-y-3">
          <Tabs value={scope} onValueChange={(v) => { setScope(v as Scope); setPage(1); }}>
            <TabsList className="grid grid-cols-4 w-full bg-background/40 h-auto">
              <TabsTrigger value="global"    className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">🌐 Global</TabsTrigger>
              <TabsTrigger value="continent" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">🌍 Continent</TabsTrigger>
              <TabsTrigger value="subregion" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">📍 Sous-région</TabsTrigger>
              <TabsTrigger value="country"   className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary">🇨🇲 Pays</TabsTrigger>
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

        {/* Podium top 3 */}
        {!loading && top3.length > 0 && (
          <div className="grid md:grid-cols-3 gap-3 mb-5">
            {top3.map((r) => (
              <PodiumCard key={r.user_id} row={r} />
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <Card className="glass p-10 text-center text-sm text-muted-foreground">
            Aucun trader classé pour cette sélection ce mois-ci.
          </Card>
        ) : (
          <>
            <Card className="glass overflow-hidden">
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
                    {visible.map((r) => {
                      const isMe = user?.id === r.user_id;
                      const country = COUNTRIES.find((c) => c.code === r.profile?.country_code);
                      return (
                        <tr key={r.user_id} className={cn(
                          "border-b border-border/30 transition-colors hover:bg-secondary/30",
                          isMe && "bg-primary/5",
                          r.displayRank <= 3 && "bg-gradient-to-r from-primary/5 to-transparent"
                        )}>
                          <td className="p-3"><div className="flex items-center justify-center w-8">{podiumIcon(r.displayRank)}</div></td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 border border-border/50">
                                <AvatarFallback className="text-[10px] bg-secondary">
                                  {(r.profile?.username || r.profile?.full_name || "?").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold truncate max-w-[140px]">{r.profile?.username || r.profile?.full_name || "Anonyme"}</span>
                                  {r.profile?.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                                  {r.is_suspicious && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                                </div>
                                <Badge className={cn("text-[9px] mt-0.5 px-1.5 py-0", rankColor(r.rank_label))}>{r.rank_label}</Badge>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 hidden sm:table-cell text-xs text-muted-foreground">
                            {country ? <span>{country.flag} {country.name}</span> : "—"}
                          </td>
                          <td className="p-3 text-right font-display font-bold text-base">{r.total_score.toFixed(1)}</td>
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

            {ranked.length > visible.length && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => setPage(page + 1)} className="gap-2">
                  <Activity className="h-3.5 w-3.5" /> Charger plus ({ranked.length - visible.length} restants)
                </Button>
              </div>
            )}
          </>
        )}

        {!user && (
          <Card className="glass p-5 mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Crée ton compte pour entrer dans le classement.</p>
            <Button asChild className="bg-gradient-brand text-primary-foreground border-0">
              <Link to="/auth?mode=signup">Rejoindre le leaderboard →</Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}

function PodiumCard({ row }: { row: LeaderboardRow & { displayRank: number } }) {
  const country = COUNTRIES.find((c) => c.code === row.profile?.country_code);
  const accent = row.displayRank === 1 ? "from-amber-400/20 to-amber-400/5 border-amber-400/40"
    : row.displayRank === 2 ? "from-zinc-300/20 to-zinc-300/5 border-zinc-300/40"
    : "from-orange-400/20 to-orange-400/5 border-orange-400/40";
  return (
    <Card className={cn("glass p-4 border bg-gradient-to-br", accent, "animate-fade-in")}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {podiumIcon(row.displayRank)}
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Top {row.displayRank}</span>
        </div>
        {row.profile?.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
      </div>
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-border/50">
          <AvatarFallback className="bg-secondary text-sm">
            {(row.profile?.username || row.profile?.full_name || "?").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold truncate">{row.profile?.username || row.profile?.full_name || "Anonyme"}</div>
          <div className="text-xs text-muted-foreground truncate">{country ? `${country.flag} ${country.name}` : "—"}</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/30 flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
          <div className="font-display text-2xl font-bold">{row.total_score.toFixed(1)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Profit</div>
          <div className={cn("font-mono text-sm", row.profit_pct >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {row.profit_pct >= 0 ? "+" : ""}{row.profit_pct.toFixed(1)}%
          </div>
        </div>
      </div>
    </Card>
  );
}

function PosCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background/40 rounded-lg p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
      <div className="font-display text-2xl font-bold mt-1">#{value || "—"}</div>
    </div>
  );
}
