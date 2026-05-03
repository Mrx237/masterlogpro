import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { COUNTRIES } from "@/lib/countries";
import { toast } from "sonner";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon, Mail, KeyRound, Loader2, ShieldCheck, GraduationCap, Activity,
  Globe, Target, AlertTriangle, Trash2, Calendar, TrendingUp, Trophy, Save,
} from "lucide-react";

const nameSchema = z.string().trim().min(2, "Nom trop court").max(80);
const emailSchema = z.string().trim().email("Email invalide").max(255);
const pwSchema = z.string().min(6, "6 caractères minimum").max(72);

const EXPERIENCE = ["Débutant", "Intermédiaire", "Avancé", "Expert"] as const;
const STYLES = ["Scalping", "Day Trading", "Swing", "Position"] as const;

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "bg-muted" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: 25, label: "Faible", color: "bg-loss" };
  if (s === 2) return { score: 55, label: "Moyen", color: "bg-[hsl(var(--warn))]" };
  if (s === 3) return { score: 80, label: "Bon", color: "bg-primary" };
  return { score: 100, label: "Excellent", color: "bg-gain" };
}

export default function Profile() {
  const { user, profile, isAdmin, isStudent, isSubscriber } = useAuth();
  const navigate = useNavigate();

  // identité
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState<string>("");
  const [experience, setExperience] = useState<string>("");

  // password
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  // objectifs
  const [dailyLoss, setDailyLoss] = useState<string>("");
  const [maxRisk, setMaxRisk] = useState<string>("");
  const [weeklyTarget, setWeeklyTarget] = useState<string>("");
  const [tradingStyle, setTradingStyle] = useState<string>("");

  // stats
  const [stats, setStats] = useState({ totalTrades: 0, winRate: 0, bestStreak: 0 });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, country_code, trading_experience, trading_style, daily_loss_limit, max_risk_per_trade, weekly_trade_target, best_streak")
        .eq("id", user.id)
        .maybeSingle();
      if (p) {
        setFullName(p.full_name ?? "");
        setCountryCode(p.country_code ?? "");
        setExperience((p as any).trading_experience ?? "");
        setTradingStyle((p as any).trading_style ?? "");
        setDailyLoss((p as any).daily_loss_limit != null ? String((p as any).daily_loss_limit) : "");
        setMaxRisk((p as any).max_risk_per_trade != null ? String((p as any).max_risk_per_trade) : "");
        setWeeklyTarget((p as any).weekly_trade_target != null ? String((p as any).weekly_trade_target) : "");
      }

      const { data: trades } = await supabase
        .from("trades")
        .select("status, trade_at")
        .eq("user_id", user.id)
        .order("trade_at", { ascending: true });
      const wins = (trades ?? []).filter((t: any) => t.status === "win").length;
      const losses = (trades ?? []).filter((t: any) => t.status === "loss").length;
      const closed = wins + losses;
      let best = 0, cur = 0;
      (trades ?? []).forEach((t: any) => {
        if (t.status === "win") { cur++; if (cur > best) best = cur; }
        else if (t.status === "loss") { cur = 0; }
      });
      setStats({
        totalTrades: trades?.length ?? 0,
        winRate: closed ? Math.round((wins / closed) * 100) : 0,
        bestStreak: Math.max(best, (p as any)?.best_streak ?? 0),
      });
    })();
  }, [user]);

  const role = isAdmin ? "Admin" : isStudent ? "Élève" : isSubscriber ? "Abonné" : "Visiteur";
  const roleClass = isAdmin
    ? "border-accent/40 text-accent bg-accent/10"
    : isStudent
    ? "border-student/40 text-student bg-student/10"
    : "border-primary/40 text-primary bg-primary/10";

  const memberSince = useMemo(() => {
    const d = user?.created_at ? new Date(user.created_at) : null;
    return d ? d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—";
  }, [user]);

  const country = COUNTRIES.find((c) => c.code === countryCode);
  const pwStrength = passwordStrength(pw);

  async function saveIdentity() {
    const p = nameSchema.safeParse(fullName);
    if (!p.success) return toast.error(p.error.errors[0].message);
    const c = COUNTRIES.find((x) => x.code === countryCode);
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      full_name: p.data,
      country_code: countryCode || null,
      country_name: c?.name ?? null,
      continent: c?.continent ?? null,
      sub_region: c?.subRegion ?? null,
      trading_experience: experience || null,
    } as any).eq("id", user!.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour");
  }

  async function saveEmail() {
    const p = emailSchema.safeParse(email);
    if (!p.success) return toast.error(p.error.errors[0].message);
    if (p.data === user?.email) return toast.info("Email inchangé");
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: p.data });
    setSavingEmail(false);
    if (error) return toast.error(error.message);
    toast.success("Vérifie ta boîte mail pour confirmer");
  }

  async function savePassword() {
    const p = pwSchema.safeParse(pw);
    if (!p.success) return toast.error(p.error.errors[0].message);
    if (pw !== pw2) return toast.error("Les mots de passe ne correspondent pas");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) return toast.error(error.message);
    setPw(""); setPw2("");
    toast.success("Mot de passe mis à jour");
  }

  async function saveGoals() {
    setSavingGoals(true);
    const { error } = await supabase.from("profiles").update({
      daily_loss_limit: dailyLoss ? Number(dailyLoss) : null,
      max_risk_per_trade: maxRisk ? Number(maxRisk) : null,
      weekly_trade_target: weeklyTarget ? Number(weeklyTarget) : null,
      trading_style: tradingStyle || null,
    } as any).eq("id", user!.id);
    setSavingGoals(false);
    if (error) return toast.error(error.message);
    toast.success("Objectifs enregistrés");
  }

  async function deleteAccount() {
    setDeleting(true);
    const { error } = await supabase.functions.invoke("delete-account");
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Compte supprimé");
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AppHeader />
      <div className="absolute top-0 right-0 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <main className="container relative py-6 md:py-10 max-w-3xl space-y-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-mono mb-2">
            <UserIcon className="h-3 w-3" /> Compte
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-bold mb-1">Mon profil</h1>
          <p className="text-sm text-muted-foreground">Gère tes informations, ta sécurité et tes objectifs.</p>
        </div>

        {/* HERO CARD */}
        <Card className="glass-strong relative overflow-hidden p-6 rounded-2xl">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/40 blur-md" />
              <div className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-brand text-primary-foreground font-display font-bold text-3xl ring-2 ring-primary/60">
                {(fullName || email || "?").slice(0, 1).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="font-display text-xl md:text-2xl font-bold truncate">{fullName || "Sans nom"}</h2>
                <Badge className={`border ${roleClass} inline-flex items-center gap-1`}>
                  {isAdmin ? <ShieldCheck className="h-3 w-3" /> : isStudent ? <GraduationCap className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                  {role}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">{email}</div>
              <div className="text-[11px] text-muted-foreground/80 mt-1 inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Membre depuis {memberSince}
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-1 divide-x divide-border/40">
            <MiniStat icon={TrendingUp} label="Trades" value={stats.totalTrades} />
            <MiniStat icon={Target} label="Win rate" value={`${stats.winRate}%`} />
            <MiniStat icon={Trophy} label="Meilleure série" value={stats.bestStreak} />
          </div>
        </Card>

        {/* INFO PERSO */}
        <SectionCard label="Profil" title="Informations personnelles" icon={UserIcon}>
          <div className="grid gap-4">
            <Field label="Nom complet">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 bg-[hsl(226_60%_5%)] border-border focus:border-primary" />
            </Field>

            <Field label="Pays">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="h-11 bg-[hsl(226_60%_5%)] border-border focus:border-primary">
                  <SelectValue placeholder="Choisir un pays">
                    {country && <span>{country.flag} {country.name}</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="mr-2">{c.flag}</span>{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Niveau d'expérience">
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger className="h-11 bg-[hsl(226_60%_5%)] border-border focus:border-primary">
                  <SelectValue placeholder="Choisir un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Button onClick={saveIdentity} disabled={savingProfile} className="w-full h-11 bg-gradient-brand text-primary-foreground border-0 font-semibold">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer les modifications
            </Button>
          </div>
        </SectionCard>

        {/* SÉCURITÉ */}
        <SectionCard label="Sécurité" title="Sécurité du compte" icon={KeyRound}>
          <div className="grid gap-5">
            <Field label="Adresse email">
              <div className="flex gap-2">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-[hsl(226_60%_5%)] border-border focus:border-primary flex-1" />
                <Button onClick={saveEmail} disabled={savingEmail} variant="outline" className="border-primary/30 h-11">
                  {savingEmail && <Loader2 className="h-4 w-4 animate-spin" />} Modifier
                </Button>
              </div>
              <p className="text-[10px] italic text-muted-foreground/70 mt-1.5">Un email de confirmation sera envoyé à la nouvelle adresse.</p>
            </Field>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nouveau mot de passe">
                <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-11 bg-[hsl(226_60%_5%)] border-border focus:border-primary" />
              </Field>
              <Field label="Confirmer">
                <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="h-11 bg-[hsl(226_60%_5%)] border-border focus:border-primary" />
              </Field>
            </div>

            {pw && (
              <div>
                <div className="h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
                  <div className={`h-full transition-all ${pwStrength.color}`} style={{ width: `${pwStrength.score}%` }} />
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">Force : <span className="text-foreground/90">{pwStrength.label}</span></div>
              </div>
            )}

            <Button onClick={savePassword} disabled={savingPw || !pw} className="w-full h-11 bg-gradient-brand text-primary-foreground border-0 font-semibold">
              {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Mettre à jour le mot de passe
            </Button>
          </div>
        </SectionCard>

        {/* OBJECTIFS */}
        <SectionCard label="Objectifs" title="Mes objectifs de trading" icon={Target}>
          <div className="grid gap-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Perte max / jour ($)">
                <Input type="number" min="0" value={dailyLoss} onChange={(e) => setDailyLoss(e.target.value)} placeholder="ex: 50" className="h-11 bg-[hsl(226_60%_5%)] border-border focus:border-primary" />
              </Field>
              <Field label="Risque / trade (%)">
                <Input type="number" min="0" step="0.1" value={maxRisk} onChange={(e) => setMaxRisk(e.target.value)} placeholder="ex: 2" className="h-11 bg-[hsl(226_60%_5%)] border-border focus:border-primary" />
              </Field>
              <Field label="Trades / semaine">
                <Input type="number" min="0" value={weeklyTarget} onChange={(e) => setWeeklyTarget(e.target.value)} placeholder="ex: 10" className="h-11 bg-[hsl(226_60%_5%)] border-border focus:border-primary" />
              </Field>
            </div>

            <Field label="Style de trading">
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => {
                  const active = tradingStyle === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTradingStyle(active ? "" : s)}
                      className={`px-4 h-9 rounded-full text-xs font-medium transition-all border ${
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_-5px_hsl(var(--primary))]"
                          : "border-border bg-[hsl(226_60%_5%)] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Button onClick={saveGoals} disabled={savingGoals} className="w-full h-11 bg-gradient-brand text-primary-foreground border-0 font-semibold">
              {savingGoals ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer les objectifs
            </Button>
          </div>
        </SectionCard>

        {/* DANGER ZONE */}
        <Card className="rounded-2xl border-2 border-loss/40 bg-loss/5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-loss" />
            <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-loss">Zone de danger</div>
          </div>
          <h3 className="font-display text-lg font-bold mb-1">Supprimer mon compte</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Cette action est <strong className="text-loss">irréversible</strong>. Toutes tes données (trades, exercices, paiements, profil) seront définitivement supprimées.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-loss/60 text-loss hover:bg-loss/10 hover:text-loss">
                <Trash2 className="h-4 w-4" /> Supprimer mon compte
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprime <strong>définitivement</strong> ton compte et toutes tes données. Tu ne pourras pas les récupérer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAccount} disabled={deleting} className="bg-loss text-loss-foreground hover:bg-loss/90">
                  {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Oui, supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </main>
    </div>
  );
}

function SectionCard({ label, title, icon: Icon, children }: { label: string; title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Icon className="h-3 w-3 text-primary" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-primary">{label}</span>
      </div>
      <Card className="glass rounded-2xl p-6 border-border/60">
        <h3 className="font-display text-base font-bold mb-4">{title}</h3>
        {children}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="px-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-mono font-bold text-lg mt-0.5">{value}</div>
    </div>
  );
}
