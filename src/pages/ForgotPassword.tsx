import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, ArrowLeft, KeyRound, Loader2, MailCheck } from "lucide-react";

const schema = z.string().trim().email("Email invalide").max(255);

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(email);
    if (!p.success) return toast.error(p.error.errors[0].message);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(p.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Email envoyé !");
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
          <KeyRound className="h-3 w-3" /> Récupération
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight mb-2">Mot de passe oublié ?</h1>
        <p className="text-muted-foreground mb-6">🔐 Entre ton email pour recevoir un lien de réinitialisation.</p>

        <div className="glass-strong rounded-2xl p-6 shadow-elevated">
          {sent ? (
            <div className="text-center py-4 space-y-3">
              <div className="grid place-items-center mx-auto h-12 w-12 rounded-full bg-primary/15 text-primary">
                <MailCheck className="h-6 w-6" />
              </div>
              <div className="font-display font-semibold">Vérifie ta boîte mail</div>
              <p className="text-sm text-muted-foreground">Un lien de réinitialisation a été envoyé à <strong className="text-foreground">{email}</strong>.</p>
              <Button asChild variant="ghost" className="mt-2"><Link to="/auth"><ArrowLeft className="h-4 w-4" /> Retour à la connexion</Link></Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 bg-background/40" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-brand text-primary-foreground border-0 font-semibold glow-cyan">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer le lien →
              </Button>
              <Link to="/auth" className="block text-center text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3 inline mr-1" /> Retour à la connexion
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
