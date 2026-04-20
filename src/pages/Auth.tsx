import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LineChart, Loader2 } from "lucide-react";

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Nom trop court").max(80),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "Min. 6 caractères").max(72),
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.full_name },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Compte créé ! Vous pouvez vous connecter.");
    navigate("/dashboard");
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Connecté !");
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-secondary/40">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="grid h-9 w-9 place-items-center rounded-md gradient-hero text-primary-foreground">
            <LineChart className="h-4 w-4" />
          </div>
          <span className="font-bold text-xl">MasterLog<span className="text-accent">Pro</span></span>
        </Link>
        <Card className="p-6 shadow-elevated">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full mb-5">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="li-email">Email</Label><Input id="li-email" name="email" type="email" required /></div>
                <div className="space-y-1.5"><Label htmlFor="li-pw">Mot de passe</Label><Input id="li-pw" name="password" type="password" required /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}Se connecter</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="su-name">Nom complet</Label><Input id="su-name" name="full_name" required /></div>
                <div className="space-y-1.5"><Label htmlFor="su-email">Email</Label><Input id="su-email" name="email" type="email" required /></div>
                <div className="space-y-1.5"><Label htmlFor="su-pw">Mot de passe</Label><Input id="su-pw" name="password" type="password" minLength={6} required /></div>
                <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}Créer mon compte</Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link to="/" className="hover:underline">← Retour à l'accueil</Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;
