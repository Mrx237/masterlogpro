import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { OFFERS, OfferKey, formatFCFA } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";

interface PaymentRow {
  id: string; user_id: string; offer: OfferKey; amount_fcfa: number; method: string;
  payer_phone: string | null; proof_path: string | null; status: string; note: string | null;
  created_at: string; admin_note: string | null;
  profiles?: { email: string | null; full_name: string | null } | null;
}

const Admin = () => {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PaymentRow | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      // fetch profiles separately (no FK relation in PostgREST inferred)
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", userIds);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setRows(data.map((r: any) => ({ ...r, profiles: map.get(r.user_id) ?? null })));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function openDetail(row: PaymentRow) {
    setActive(row);
    setAdminNote(row.admin_note ?? "");
    setProofUrl(null);
    if (row.proof_path) {
      const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(row.proof_path, 600);
      setProofUrl(data?.signedUrl ?? null);
    }
  }

  async function decide(approve: boolean) {
    if (!active) return;
    setBusy(true);

    const { error } = await supabase.from("payment_requests").update({
      status: approve ? "approved" : "rejected",
      admin_note: adminNote || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", active.id);

    if (error) { toast.error(error.message); setBusy(false); return; }

    if (approve) {
      const offer = OFFERS[active.offer];
      const role = offer.type === "formation" ? "student" : "subscriber";
      const ends = offer.durationDays
        ? new Date(Date.now() + offer.durationDays * 86400000).toISOString()
        : null;

      // Upsert role
      await supabase.from("user_roles").upsert(
        { user_id: active.user_id, role: role as any },
        { onConflict: "user_id,role" }
      );
      // Activate profile
      await supabase.from("profiles").update({
        status: "active",
        subscription_ends_at: ends,
      }).eq("id", active.user_id);
    }

    toast.success(approve ? "Compte activé ✅" : "Demande rejetée");
    setActive(null);
    setBusy(false);
    load();
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Administration</h1>
        <p className="text-sm text-muted-foreground mb-6">Validation manuelle des paiements Mobile Money.</p>

        <Card className="shadow-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Aucune demande pour le moment.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Utilisateur</th>
                    <th className="px-3 py-2.5">Offre</th>
                    <th className="px-3 py-2.5">Montant</th>
                    <th className="px-3 py-2.5">Méthode</th>
                    <th className="px-3 py-2.5">Statut</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-secondary/30">
                      <td className="px-3 py-2.5">{new Date(r.created_at).toLocaleString("fr-FR")}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{r.profiles?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.profiles?.email}</div>
                      </td>
                      <td className="px-3 py-2.5">{OFFERS[r.offer]?.label}</td>
                      <td className="px-3 py-2.5 font-medium">{formatFCFA(r.amount_fcfa)}</td>
                      <td className="px-3 py-2.5 uppercase text-xs">{r.method}</td>
                      <td className="px-3 py-2.5">
                        {r.status === "pending" && <Badge variant="secondary">En attente</Badge>}
                        {r.status === "approved" && <Badge className="bg-gain text-gain-foreground hover:bg-gain">Validé</Badge>}
                        {r.status === "rejected" && <Badge className="bg-loss text-loss-foreground hover:bg-loss">Rejeté</Badge>}
                      </td>
                      <td className="px-3 py-2.5"><Button size="sm" variant="outline" onClick={() => openDetail(r)}>Examiner</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Demande de paiement</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <Row k="Utilisateur" v={`${active.profiles?.full_name ?? ""} (${active.profiles?.email ?? ""})`} />
              <Row k="Offre" v={`${OFFERS[active.offer]?.label} — ${formatFCFA(active.amount_fcfa)}`} />
              <Row k="Méthode" v={active.method.toUpperCase()} />
              <Row k="N° payeur" v={active.payer_phone ?? "—"} />
              {active.note && <Row k="Note" v={active.note} />}
              {proofUrl ? (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Preuve</div>
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={proofUrl} alt="Preuve" className="max-h-64 rounded border" />
                  </a>
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent inline-flex items-center gap-1 mt-1">Ouvrir <ExternalLink className="h-3 w-3" /></a>
                </div>
              ) : active.proof_path ? <div className="text-xs text-muted-foreground">Chargement preuve...</div> : <div className="text-xs text-muted-foreground">Pas de preuve uploadée (à voir sur WhatsApp).</div>}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Note admin</div>
                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} maxLength={500} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => decide(false)} disabled={busy}>Rejeter</Button>
            <Button onClick={() => decide(true)} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Valider et activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-4 border-b pb-1.5"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></div>
);

export default Admin;
