import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, ArrowLeft, Loader2, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Nom trop court").max(80),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "Min. 6 caractères").max(72),
  country_code: z.string().length(2, "Pays requis"),
});
const loginSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(1, "Mot de passe requis").max(72),
});

const Auth = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [loading, setLoading] = useState(false);

  // Same-origin relative path only (starts with "/" but not "//" or "/\\")
  const rawNext = params.get("next");
  const nextPath =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")
      ? rawNext
      : "/dashboard";
  const postAuthUrl = `${window.location.origin}${nextPath}`;

  useEffect(() => {
    // Capture & persist referral code from ?ref=CODE
    const ref = params.get("ref");
    if (ref) {
      try { localStorage.setItem("mlp_ref", ref.trim().toUpperCase()); } catch {}
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(nextPath, { replace: true });
    });
  }, [navigate, params, nextPath]);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    const country = COUNTRIES.find((c) => c.code === parsed.data.country_code);
    if (!country) { toast.error("Pays invalide"); return; }

    setLoading(true);
    let referralCode: string | null = null;
    try { referralCode = localStorage.getItem("mlp_ref"); } catch {}
    const { data: signupData, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: postAuthUrl,
        data: {
          full_name: parsed.data.full_name,
          ...(referralCode ? { referral_code: referralCode } : {}),
        },
      },
    });
    if (!error) { try { localStorage.removeItem("mlp_ref"); } catch {} }

    if (error) { setLoading(false); toast.error(error.message); return; }

    // Mise à jour du profil avec pays / continent / sous-région
    if (signupData.user) {
      await supabase.from("profiles").update({
        country_code: country.code,
        country_name: country.name,
        continent: country.continent,
        sub_region: country.subRegion,
      }).eq("id", signupData.user.id);
    }

    setLoading(false);
    toast.success("Compte créé !");
    navigate(nextPath, { replace: true });
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Connecté !");
    navigate(nextPath, { replace: true });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 noise relative">
      {/* ─── LEFT — visual cockpit panel ─── */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-r border-border/50">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute top-1/4 -left-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 -right-32 h-[500px] w-[500px] rounded-full bg-accent/20 blur-[120px] animate-pulse-glow" style={{ animationDelay: '1s' }} />

        <div className="relative flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand">
              <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <div className="font-display font-bold text-[17px]">MasterLog<span className="text-gradient-cyan">Pro</span></div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">Trading Cockpit</div>
            </div>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Accueil
          </Link>
        </div>

        <div className="relative space-y-8">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" /> Live
          </div>
          <h2 className="font-display text-4xl xl:text-5xl font-bold leading-[1.05]">
            Le cockpit qui<br />
            <span className="text-gradient-brand">forge la discipline</span><br />
            des traders sérieux.
          </h2>
          <p className="text-muted-foreground max-w-md">
            Documente. Mesure. Corrige. Trois étapes pour transformer ton trading en méthode reproductible.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { icon: TrendingUp, label: "Win rate", value: "68%" },
              { icon: Zap, label: "Activation", value: "<5min" },
              { icon: ShieldCheck, label: "Sécurisé", value: "Mobile Money" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-3.5">
                <s.icon className="h-4 w-4 text-primary mb-2" />
                <div className="font-display font-bold text-sm">{s.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative font-mono text-[10px] text-muted-foreground tracking-widest uppercase flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Auth chiffrée · Aucune donnée vendue
        </div>
      </aside>

      {/* ─── RIGHT — form ─── */}
      <main className="flex flex-col justify-center items-center p-6 md:p-10 relative">
        {/* Mobile header */}
        <Link to="/" className="lg:hidden absolute top-6 left-6 flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand">
            <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold">MasterLog<span className="text-gradient-cyan">Pro</span></span>
        </Link>

        <div className="w-full max-w-md mt-16 lg:mt-0">
          <div className="mb-8">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-3">
              {tab === "login" ? "Bon retour" : "Bienvenue"}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">
              {tab === "login" ? (
                <>Connecte-toi à<br /><span className="text-gradient-cyan">ton cockpit.</span></>
              ) : (
                <>Crée ton compte<br /><span className="text-gradient-brand">en 30 secondes.</span></>
              )}
            </h1>
          </div>

          <div className="glass-strong rounded-2xl p-6 md:p-7 shadow-elevated">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full mb-6 bg-background/40">
                <TabsTrigger value="login" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Connexion</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary">Inscription</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <FieldGroup id="li-email" label="Email" name="email" type="email" required />
                  <FieldGroup id="li-pw" label="Mot de passe" name="password" type="password" required />
                  <div className="flex justify-end -mt-2">
                    <Link to="/forgot-password" className="text-[11px] text-primary hover:text-primary/80 font-medium">
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-gradient-brand text-primary-foreground border-0 font-semibold glow-cyan" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Se connecter →
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <FieldGroup id="su-name" label="Nom complet" name="full_name" required />
                  <FieldGroup id="su-email" label="Email" name="email" type="email" required />
                  <FieldGroup id="su-pw" label="Mot de passe" name="password" type="password" minLength={6} required hint="Minimum 6 caractères" />
                  <div className="space-y-1.5">
                    <Label htmlFor="su-country" className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                      Pays (obligatoire)
                    </Label>
                    <Select name="country_code" required>
                      <SelectTrigger id="su-country" className="h-11 bg-background/40 border-border/60">
                        <SelectValue placeholder="Sélectionne ton pays" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/70">
                      Utilisé pour le classement régional. Modifiable plus tard.
                    </p>
                  </div>
                  <Button type="submit" className="w-full h-11 bg-gradient-brand text-primary-foreground border-0 font-semibold glow-cyan" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Créer mon compte →
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            En continuant tu acceptes nos conditions d'utilisation. Aucune carte requise.
          </p>
        </div>
      </main>
    </div>
  );
};

function FieldGroup({
  id, label, name, type = "text", required, minLength, hint,
}: { id: string; label: string; name: string; type?: string; required?: boolean; minLength?: number; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id} name={name} type={type} required={required} minLength={minLength}
        className="h-11 bg-background/40 border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary/40"
      />
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

export default Auth;
