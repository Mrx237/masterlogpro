import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, KeyRound, Loader2 } from "lucide-react";

const pwSchema = z.string().min(6, "6 caractères minimum").max(72);

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase places a recovery session after the user clicks the email link.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = pwSchema.safeParse(pw);
    if (!p.success) return toast.error(p.error.errors[0].message);
    if (pw !== pw2) return toast.error("Les mots de passe ne correspondent pas");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe réinitialisé ! Connecte-toi à nouveau.");
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 noise relative">
      <div className="absolute top-1/4 -left-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="w-full max-w-md relative">
        <Link to="/" className="flex items-center gap-2.5 mb-8">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand">
            <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="font-display font-bold">MasterLog<span className="text-gradient-cyan">Pro</span></div>
        </Link>

        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-3 inline-flex items-center gap-1">
          <KeyRound className="h-3 w-3" /> Nouveau mot de passe
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight mb-2">Réinitialisation</h1>
        <p className="text-muted-foreground mb-6">Choisis un mot de passe fort que tu n'utilises pas ailleurs.</p>

        <div className="glass-strong rounded-2xl p-6 shadow-elevated">
          {!ready ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3" />
              Vérification du lien…
              <p className="text-xs mt-3">Si rien ne se passe, réutilise le bouton dans l'email reçu.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Nouveau mot de passe</Label>
                <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} className="h-11 bg-background/40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Confirmer</Label>
                <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} className="h-11 bg-background/40" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-brand text-primary-foreground border-0 font-semibold glow-cyan">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Réinitialiser le mot de passe →
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
