import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/constants";
import { Loader2, Check, X, Users, Wallet, ArrowDownToLine, Copy } from "lucide-react";

interface Payout {
  id: string;
  affiliate_user_id: string;
  amount_fcfa: number;
  method: "momo" | "credit";
  phone: string | null;
  status: "requested" | "paid" | "rejected";
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
  profiles?: { email: string | null; full_name: string | null } | null;
}

interface TopAffiliate {
  user_id: string;
  code: string;
  balance_fcfa: number;
  total_earned_fcfa: number;
  total_paid_fcfa: number;
  ref_count: number;
  profiles?: { email: string | null; full_name: string | null } | null;
}

export function AffiliatesAdminTab() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [tops, setTops] = useState<TopAffiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Payout | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: po }, { data: aff }, { data: refs }] = await Promise.all([
      supabase.from("affiliate_payouts").select("*").order("requested_at", { ascending: false }),
      supabase.from("affiliates").select("user_id, code, balance_fcfa, total_earned_fcfa, total_paid_fcfa").order("total_earned_fcfa", { ascending: false }),
      supabase.from("affiliate_referrals").select("affiliate_user_id"),
    ]);

    const profIds = new Set<string>();
    (po ?? []).forEach((p: any) => profIds.add(p.affiliate_user_id));
    (aff ?? []).forEach((a: any) => profIds.add(a.user_id));

    const { data: profs } = profIds.size
      ? await supabase.from("profiles").select("id, email, full_name").in("id", Array.from(profIds))
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    const refCounts = new Map<string, number>();
    (refs ?? []).forEach((r: any) => refCounts.set(r.affiliate_user_id, (refCounts.get(r.affiliate_user_id) ?? 0) + 1));

    setPayouts((po ?? []).map((p: any) => ({ ...p, profiles: pmap.get(p.affiliate_user_id) ?? null })));
    setTops(
      (aff ?? [])
        .map((a: any) => ({
          ...a,
          ref_count: refCounts.get(a.user_id) ?? 0,
          profiles: pmap.get(a.user_id) ?? null,
        }))
        .filter((a: TopAffiliate) => a.ref_count > 0 || a.total_earned_fcfa > 0)
        .slice(0, 20)
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const pending = payouts.filter((p) => p.status === "requested");

  return (
    <div className="space-y-6">
      {/* PAYOUTS */}
      <Card className="glass overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <div className="font-semibold flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-primary" />
              Retraits {pending.length > 0 && <Badge className="bg-primary text-primary-foreground">{pending.length} en attente</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">Valide ou rejette les demandes des affiliés.</div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : payouts.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Aucune demande.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-3">Affilié</th>
                  <th className="px-3 py-3">Montant</th>
                  <th className="px-3 py-3">Méthode</th>
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-border/50 hover:bg-secondary/30">
                    <td className="px-3 py-3">
                      <div className="font-medium">{p.profiles?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.profiles?.email}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold">{formatFCFA(p.amount_fcfa)}</td>
                    <td className="px-3 py-3 text-xs">
                      {p.method === "momo" ? (
                        <div>
                          <Badge variant="outline">📱 MoMo</Badge>
                          {p.phone && <div className="text-[11px] text-muted-foreground mt-1 font-mono">{p.phone}</div>}
                        </div>
                      ) : (
                        <Badge variant="outline">🎓 Crédit</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3"><PayoutBadge s={p.status} /></td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {new Date(p.requested_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-3">
                      <Button size="sm" variant="outline" onClick={() => setActive(p)}>Gérer</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* TOP AFFILIATES */}
      <Card className="glass overflow-hidden">
        <div className="p-4 border-b border-border/50 font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Top affiliés
        </div>
        {tops.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucun affilié actif.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-3">Affilié</th>
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3">Filleuls</th>
                  <th className="px-3 py-3">Gagné</th>
                  <th className="px-3 py-3">Solde</th>
                </tr>
              </thead>
              <tbody>
                {tops.map((a) => (
                  <tr key={a.user_id} className="border-t border-border/50">
                    <td className="px-3 py-3">
                      <div className="font-medium">{a.profiles?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{a.profiles?.email}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{a.code}</td>
                    <td className="px-3 py-3">{a.ref_count}</td>
                    <td className="px-3 py-3 text-gain font-semibold">{formatFCFA(a.total_earned_fcfa)}</td>
                    <td className="px-3 py-3"><Wallet className="h-3 w-3 inline mr-1 text-muted-foreground" />{formatFCFA(a.balance_fcfa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PayoutDialog payout={active} onClose={() => setActive(null)} onChanged={load} />
    </div>
  );
}

function PayoutBadge({ s }: { s: string }) {
  if (s === "paid") return <Badge className="bg-gain text-gain-foreground">Payé</Badge>;
  if (s === "rejected") return <Badge className="bg-loss text-loss-foreground">Rejeté</Badge>;
  return <Badge variant="secondary">En attente</Badge>;
}

function PayoutDialog({ payout, onClose, onChanged }: { payout: Payout | null; onClose: () => void; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (payout) setNote(payout.admin_note ?? ""); }, [payout]);

  if (!payout) return null;

  async function update(status: "paid" | "rejected") {
    setBusy(true);
    const { error } = await supabase
      .from("affiliate_payouts")
      .update({ status, admin_note: note || null })
      .eq("id", payout!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(status === "paid" ? "Marqué payé ✅" : "Rejeté (solde recrédité)");
    onClose();
    onChanged();
  }

  return (
    <Dialog open={!!payout} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retrait {formatFCFA(payout.amount_fcfa)}</DialogTitle>
          <DialogDescription>
            {payout.profiles?.full_name || payout.profiles?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border bg-secondary/30 p-3 space-y-1.5">
            <Row label="Méthode" value={payout.method === "momo" ? "📱 Mobile Money" : "🎓 Crédit interne"} />
            {payout.phone && (
              <Row
                label="Numéro"
                value={
                  <span className="font-mono inline-flex items-center gap-2">
                    {payout.phone}
                    <button onClick={() => { navigator.clipboard.writeText(payout.phone!); toast.success("Numéro copié"); }} className="opacity-60 hover:opacity-100">
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                }
              />
            )}
            <Row label="Statut actuel" value={<PayoutBadge s={payout.status} />} />
            <Row label="Demandé le" value={new Date(payout.requested_at).toLocaleString("fr-FR")} />
          </div>

          <div>
            <label className="text-xs font-medium">Note admin (optionnel)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Ex: payé via MTN MoMo, ref TX..." />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          {payout.status === "requested" && (
            <>
              <Button variant="outline" onClick={() => update("rejected")} disabled={busy} className="border-loss/40 text-loss hover:bg-loss/10">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Rejeter
              </Button>
              <Button onClick={() => update("paid")} disabled={busy} className="bg-gain text-gain-foreground hover:bg-gain/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Marquer payé
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
