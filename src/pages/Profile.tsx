import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { User as UserIcon, Mail, KeyRound, Loader2, ShieldCheck, GraduationCap, Activity } from "lucide-react";

const nameSchema = z.string().trim().min(2, "Nom trop court").max(80);
const emailSchema = z.string().trim().email("Email invalide").max(255);
const pwSchema = z.string().min(6, "6 caractères minimum").max(72);

export default function Profile() {
  const { user, profile, isAdmin, isStudent, isSubscriber } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? "");
    if (user) setEmail(user.email ?? "");
  }, [profile, user]);

  const role = isAdmin ? "Admin" : isStudent ? "Élève" : isSubscriber ? "Abonné" : "Visiteur";
  const roleColor = isAdmin ? "border-accent/40 text-accent bg-accent/10"
    : isStudent ? "border-student/40 text-student bg-student/10"
    : "border-primary/40 text-primary bg-primary/10";

  async function saveName() {
    const p = nameSchema.safeParse(fullName);
    if (!p.success) return toast.error(p.error.errors[0].message);
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: p.data }).eq("id", user!.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Nom mis à jour");
  }

  async function saveEmail() {
    const p = emailSchema.safeParse(email);
    if (!p.success) return toast.error(p.error.errors[0].message);
    if (p.data === user?.email) return toast.info("Email inchangé");
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: p.data });
    setSavingEmail(false);
    if (error) return toast.error(error.message);
    toast.success("Vérifie ta boîte mail pour confirmer le changement");
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

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AppHeader />
      <div className="absolute top-0 right-0 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <main className="container relative py-6 md:py-10 max-w-3xl">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-mono mb-2">
          <UserIcon className="h-3 w-3" /> Compte
        </div>
        <h1 className="font-display text-2xl md:text-4xl font-bold mb-2">Mon profil</h1>
        <p className="text-muted-foreground mb-6">👤 Gère tes informations personnelles et sécurise ton compte</p>

        {/* Identity card */}
        <Card className="glass-strong p-5 mb-5">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-brand text-primary-foreground font-display font-bold text-xl">
              {(fullName || email || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-lg truncate">{fullName || "Sans nom"}</div>
              <div className="text-xs text-muted-foreground truncate">{email}</div>
            </div>
            <Badge className={`border ${roleColor} inline-flex items-center gap-1`}>
              {isAdmin ? <ShieldCheck className="h-3 w-3" /> : isStudent ? <GraduationCap className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
              {role}
            </Badge>
          </div>
        </Card>

        {/* Name */}
        <Card className="glass p-5 mb-4">
          <Section icon={UserIcon} title="Nom complet" />
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 bg-background/40 flex-1" />
            <Button onClick={saveName} disabled={savingProfile} className="bg-gradient-brand text-primary-foreground border-0 font-semibold">
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
            </Button>
          </div>
        </Card>

        {/* Email */}
        <Card className="glass p-5 mb-4">
          <Section icon={Mail} title="Adresse email" />
          <div className="flex flex-col sm:flex-row gap-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-background/40 flex-1" />
            <Button onClick={saveEmail} disabled={savingEmail} variant="outline" className="border-primary/30">
              {savingEmail && <Loader2 className="h-4 w-4 animate-spin" />} Modifier
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-2">Un email de confirmation sera envoyé à la nouvelle adresse.</p>
        </Card>

        {/* Password */}
        <Card className="glass p-5">
          <Section icon={KeyRound} title="Changer le mot de passe" />
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Nouveau</Label>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-11 bg-background/40" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Confirmer</Label>
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="h-11 bg-background/40" />
            </div>
          </div>
          <Button onClick={savePassword} disabled={savingPw || !pw} className="mt-3 w-full sm:w-auto bg-gradient-brand text-primary-foreground border-0 font-semibold">
            {savingPw && <Loader2 className="h-4 w-4 animate-spin" />} Mettre à jour
          </Button>
        </Card>
      </main>
    </div>
  );
}

function Section({ icon: I, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <I className="h-4 w-4 text-primary" />
      <div className="font-display font-semibold">{title}</div>
    </div>
  );
}
