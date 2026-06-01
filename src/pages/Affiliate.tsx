import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatFCFA, buildWhatsAppLink } from "@/lib/constants";
import {
  Loader2, Copy, Share2, Users, Wallet, TrendingUp, Gift, ArrowDownToLine, MessageCircle, Link as LinkIcon,
} from "lucide-react";

interface Affiliate {
  code: string;
  balance_fcfa: number;
  total_earned_fcfa: number;
  total_paid_fcfa: number;
}
interface Referral { referred_user_id: string; created_at: string; profiles?: { email: string | null; full_name: string | null; status: string } | null }
interface Commission { id: string; amount_fcfa: number; status: string; created_at: string; referred_user_id: string }
interface Payout { id: string; amount_fcfa: number; method: string; phone: string | null; status: string; requested_at: string; processed_at: string | null; admin_note: string | null }

const MIN_PAYOUT = 5000;

export default function Affiliate() {
  const { user, loading: authLoading } = useAuth();
  const [aff, setAff] = useState<Affiliate | null>(null);
  const [refs, setRefs] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutOpen, setPayoutOpen] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: a }, { data: r }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("affiliates").select("code,balance_fcfa,total_earned_fcfa,total_paid_fcfa").eq("user_id", user.id).maybeSingle(),
      supabase.from("affiliate_referrals").select("*").eq("affiliate_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_commissions").select("*").eq("affiliate_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("affiliate_payouts").select("*").eq("affiliate_user_id", user.id).order("requested_at", { ascending: false }),
    ]);

    // self-heal: create code if missing (e.g. signed up before backfill)
    let affRow = a as Affiliate | null;
    if (!affRow) {
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      const { data: created } = await supabase
        .from("affiliates")
        .insert({ user_id: user.id, code })
        .select("code,balance_fcfa,total_earned_fcfa,total_paid_fcfa")
        .single();
      affRow = created as Affiliate;
    }
    setAff(affRow);

    if (r && r.length) {
      const ids = r.map((x: any) => x.referred_user_id);
      const { data: profs } = await supabase.from("profiles").select("id,email,full_name,status").in("id", ids);
      const map = new Map((profs ?? []).map((pr: any) => [pr.id, pr]));
      setRefs(r.map((x: any) => ({ ...x, profiles: map.get(x.referred_user_id) ?? null })));
    } else setRefs([]);

    setCommissions((c ?? []) as Commission[]);
    setPayouts((p ?? []) as Payout[]);
    setLoading(false);
  }

  useEffect(() => { if (user) load(); }, [user]);

  if (authLoading || !user) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const link = aff ? `${window.location.origin}/auth?mode=signup&ref=${aff.code}` : "";
  const waMsg = `Salut 👋 Rejoins MasterLogPro avec mon lien et débloquons ensemble nos performances de trading 📈 ${link}`;

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  }

  async function shareNative() {
    if (navigator.share) {
      try { await navigator.share({ title: "MasterLogPro", text: waMsg, url: link }); } catch {}
    } else { copy(link, "Lien"); }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden noise">
      <AppHeader />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />

      <main className="container relative py-8 max-w-5xl space-y-6">
        {/* HEADER */}
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-primary mb-2">
            <Gift className="h-3 w-3" /> Programme affilié
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">
            Recommande, <span className="text-gradient-brand">gagne 20%</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Tu gagnes <strong className="text-foreground">20%</strong> sur chaque paiement validé d'un filleul.
            Retrait à partir de <strong className="text-foreground">{formatFCFA(MIN_PAYOUT)}</strong> en Mobile Money ou crédit interne.
          </p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Wallet} label="Solde dispo" value={formatFCFA(aff?.balance_fcfa ?? 0)} accent />
          <StatCard icon={TrendingUp} label="Total gagné" value={formatFCFA(aff?.total_earned_fcfa ?? 0)} />
          <StatCard icon={ArrowDownToLine} label="Total retiré" value={formatFCFA(aff?.total_paid_fcfa ?? 0)} />
          <StatCard icon={Users} label="Filleuls" value={refs.length} />
        </div>

        {/* LINK + CTA */}
        <Card className="glass-strong p-6">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-primary mb-3">
            <LinkIcon className="h-3 w-3" /> Ton lien & code
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Code</Label>
              <div className="mt-1.5 flex gap-2">
                <Input value={aff?.code ?? ""} readOnly className="font-mono font-bold text-lg tracking-widest text-center" />
                <Button variant="outline" onClick={() => aff && copy(aff.code, "Code")}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Lien de parrainage</Label>
              <div className="mt-1.5 flex gap-2">
                <Input value={link} readOnly className="text-xs" />
                <Button variant="outline" onClick={() => copy(link, "Lien")}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-2 mt-4">
            <Button onClick={shareNative} className="bg-gradient-brand text-primary-foreground border-0 font-semibold">
              <Share2 className="h-4 w-4" /> Partager
            </Button>
            <a href={buildWhatsAppLink(waMsg)} target="_blank" rel="noreferrer">
              <Button variant="outline" className="w-full"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
            </a>
            <Button
              variant="outline"
              onClick={() => setPayoutOpen(true)}
              disabled={(aff?.balance_fcfa ?? 0) < MIN_PAYOUT}
            >
              <ArrowDownToLine className="h-4 w-4" /> Retirer
            </Button>
          </div>
          {(aff?.balance_fcfa ?? 0) < MIN_PAYOUT && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Encore {formatFCFA(MIN_PAYOUT - (aff?.balance_fcfa ?? 0))} pour débloquer le retrait.
            </p>
          )}
        </Card>

        {/* REFERRALS */}
        <Card className="glass overflow-hidden">
          <div className="p-4 border-b border-border/50 font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Filleuls ({refs.length})
          </div>
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : refs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aucun filleul pour l'instant. Partage ton lien !
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {refs.map((r) => (
                <div key={r.referred_user_id} className="p-4 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.profiles?.full_name || r.profiles?.email || "Utilisateur"}</div>
                    <div className="text-xs text-muted-foreground">Inscrit le {new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                  </div>
                  <Badge variant={r.profiles?.status === "active" ? "default" : "secondary"} className={r.profiles?.status === "active" ? "bg-gain text-gain-foreground" : ""}>
                    {r.profiles?.status === "active" ? "✅ Actif" : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* COMMISSIONS + PAYOUTS */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="glass overflow-hidden">
            <div className="p-4 border-b border-border/50 font-semibold">Commissions reçues</div>
            {commissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Aucune commission encore.</div>
            ) : (
              <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
                {commissions.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold text-gain">+{formatFCFA(c.amount_fcfa)}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString("fr-FR")}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="glass overflow-hidden">
            <div className="p-4 border-b border-border/50 font-semibold">Mes retraits</div>
            {payouts.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Aucun retrait.</div>
            ) : (
              <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
                {payouts.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-semibold">{formatFCFA(p.amount_fcfa)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.method === "momo" ? `MoMo ${p.phone ?? ""}` : "Crédit interne"} · {new Date(p.requested_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        p.status === "paid" ? "border-gain/40 text-gain bg-gain/10" :
                        p.status === "rejected" ? "border-loss/40 text-loss bg-loss/10" :
                        "border-primary/40 text-primary bg-primary/10"
                      }
                    >
                      {p.status === "paid" ? "Payé" : p.status === "rejected" ? "Rejeté" : "En attente"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      <PayoutDialog
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        balance={aff?.balance_fcfa ?? 0}
        onDone={load}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <Card className={`glass p-4 ${accent ? "ring-1 ring-primary/40" : ""}`}>
      <Icon className={`h-4 w-4 mb-2 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <div className={`font-display text-xl font-bold ${accent ? "text-gradient-cyan" : ""}`}>{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

function PayoutDialog({
  open, onClose, balance, onDone,
}: { open: boolean; onClose: () => void; balance: number; onDone: () => void }) {
  const [method, setMethod] = useState<"momo" | "credit">("momo");
  const [amount, setAmount] = useState<string>(String(balance));
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setAmount(String(balance)); setMethod("momo"); setPhone(""); } }, [open, balance]);

  async function submit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt < MIN_PAYOUT) return toast.error(`Minimum ${formatFCFA(MIN_PAYOUT)}`);
    if (amt > balance) return toast.error("Solde insuffisant");
    if (method === "momo" && phone.replace(/\D/g, "").length < 9) return toast.error("Numéro Mobile Money invalide");

    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("affiliate_payouts").insert({
      affiliate_user_id: u.user!.id,
      amount_fcfa: amt,
      method,
      phone: method === "momo" ? phone : null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Demande de retrait envoyée ✅");
    onClose();
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demande de retrait</DialogTitle>
          <DialogDescription>Solde disponible : <strong>{formatFCFA(balance)}</strong></DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <Label>Méthode</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="momo">📱 Mobile Money (MTN / Orange)</SelectItem>
                <SelectItem value="credit">🎓 Crédit interne (extension d'abonnement)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              {method === "credit"
                ? "Notre équipe utilisera ce montant pour prolonger ton abonnement ou formation."
                : "Tu recevras le montant sur ton numéro MoMo."}
            </p>
          </div>

          {method === "momo" && (
            <div>
              <Label>Numéro Mobile Money</Label>
              <Input placeholder="ex: 6XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          )}

          <div>
            <Label>Montant (FCFA)</Label>
            <Input type="number" min={MIN_PAYOUT} max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">Minimum {formatFCFA(MIN_PAYOUT)}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={busy} className="bg-gradient-brand text-primary-foreground border-0">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
