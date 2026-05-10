import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OFFERS, OfferKey, formatFCFA } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Smartphone, ArrowLeft, Zap, Bitcoin } from "lucide-react";

const schema = z.object({
  payer_phone: z.string().trim().min(8, "Numéro invalide").max(20),
  method: z.enum(["mtn", "orange", "airtel"]),
  note: z.string().trim().max(500).optional(),
});

const METHODS: { id: "mtn" | "orange" | "airtel"; label: string; number: string }[] = [
  { id: "orange", label: "Orange Money", number: MOBILE_MONEY.orange },
  { id: "mtn", label: "MTN Mobile Money", number: MOBILE_MONEY.mtn },
  { id: "airtel", label: "Airtel Money", number: MOBILE_MONEY.airtel },
];

const Payment = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const offerKey = (params.get("offer") as OfferKey) || "sub_1m";
  const offer = OFFERS[offerKey];
  const [method, setMethod] = useState<"mtn" | "orange" | "airtel">("orange");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [campayPhone, setCampayPhone] = useState("");
  const [campayLoading, setCampayLoading] = useState(false);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [campayResult, setCampayResult] = useState<{ ussd_code?: string; reference?: string; operator?: string } | null>(null);

  async function payCampay() {
    if (!user) return;
    if (campayPhone.replace(/\D/g, "").length < 9) { toast.error("Numéro invalide"); return; }
    setCampayLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("campay-initiate", {
        body: { offer: offerKey, phone: campayPhone },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Échec");
      setCampayResult({ ussd_code: data.ussd_code, reference: data.reference, operator: data.operator });
      toast.success("Demande envoyée — valide sur ton téléphone !");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCampayLoading(false);
    }
  }

  async function payCrypto() {
    if (!user) return;
    setCryptoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("nowpayments-initiate", {
        body: {
          offer: offerKey,
          success_url: `${window.location.origin}/dashboard?paid=1`,
          cancel_url: `${window.location.origin}/payment?offer=${offerKey}`,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Échec");
      window.location.href = data.invoice_url;
    } catch (e: any) {
      toast.error(e.message);
      setCryptoLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) navigate(`/auth?mode=signup`, { replace: true });
  }, [authLoading, user, navigate]);

  if (!offer) return null;
  const selectedMethod = METHODS.find((m) => m.id === method)!;

  function copy(value: string) {
    navigator.clipboard.writeText(value);
    toast.success("Copié !");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      payer_phone: fd.get("payer_phone"),
      method,
      note: fd.get("note") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    setSubmitting(true);
    let proof_path: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
      if (upErr) { toast.error("Échec upload preuve : " + upErr.message); setSubmitting(false); return; }
      proof_path = path;
    }

    const { error } = await supabase.from("payment_requests").insert({
      user_id: user.id,
      offer: offerKey,
      amount_fcfa: offer.price,
      method: parsed.data.method,
      payer_phone: parsed.data.payer_phone,
      note: parsed.data.note,
      proof_path,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande enregistrée — finalise sur WhatsApp !");
    navigate("/dashboard?pending=1");
  }

  const waMessage = `Bonjour, je viens de payer pour : ${offer.label} (${formatFCFA(offer.price)}).
Méthode : ${selectedMethod.label}
Email du compte : ${user?.email ?? ""}
Voici la preuve de paiement.`;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 max-w-3xl">
        <Link to="/subscribe" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Retour aux offres</Link>

        <Card className="p-6 mb-6 shadow-card">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{offer.label}</h1>
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            </div>
            <div className="text-3xl font-bold text-accent">{formatFCFA(offer.price)}</div>
          </div>
        </Card>

        {/* PAIEMENTS AUTOMATIQUES */}
        <Card className="p-6 mb-6 shadow-card border-2 border-accent/40 bg-accent/5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-accent" />
            <h2 className="font-semibold">Paiement automatique — activation instantanée</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Ton compte est activé immédiatement après confirmation, sans intervention manuelle.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Mobile Money via Campay */}
            <div className="rounded-lg border bg-background p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4 text-accent" /> Mobile Money (MTN / Orange CM)
              </div>
              <Input
                placeholder="Ton numéro ex: 6XXXXXXXX"
                value={campayPhone}
                onChange={(e) => setCampayPhone(e.target.value)}
              />
              <Button onClick={payCampay} disabled={campayLoading} className="w-full">
                {campayLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Payer {formatFCFA(offer.price)}
              </Button>
              {campayResult && (
                <div className="text-xs bg-secondary/60 rounded p-2 space-y-1">
                  <div>Opérateur : <strong>{campayResult.operator}</strong></div>
                  {campayResult.ussd_code && <div>Compose : <strong className="font-mono">{campayResult.ussd_code}</strong></div>}
                  <div className="text-muted-foreground">Réf : {campayResult.reference}</div>
                </div>
              )}
            </div>

            {/* Crypto via NOWPayments */}
            <div className="rounded-lg border bg-background p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bitcoin className="h-4 w-4 text-accent" /> Cryptomonnaie (BTC, USDT, ETH...)
              </div>
              <p className="text-xs text-muted-foreground">
                Paiement via NOWPayments. Tu seras redirigé vers la page sécurisée.
              </p>
              <Button onClick={payCrypto} disabled={cryptoLoading} variant="outline" className="w-full">
                {cryptoLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Payer en crypto
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Ou paiement manuel</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Card className="p-6 mb-6 shadow-card">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Smartphone className="h-5 w-5 text-accent" /> 1. Effectue le paiement</h2>
          <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="grid sm:grid-cols-3 gap-3 mb-4">
            {METHODS.map((m) => (
              <Label key={m.id} htmlFor={`m-${m.id}`} className="flex flex-col gap-1 p-3 border rounded-md cursor-pointer hover:bg-secondary [&:has(:checked)]:border-accent [&:has(:checked)]:bg-accent/5">
                <div className="flex items-center gap-2">
                  <RadioGroupItem id={`m-${m.id}`} value={m.id} />
                  <span className="font-medium text-sm">{m.label}</span>
                </div>
              </Label>
            ))}
          </RadioGroup>

          <div className="bg-secondary/60 rounded-md p-4 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Numéro {selectedMethod.label}</span>
              <button onClick={() => copy(selectedMethod.number)} className="font-mono font-bold flex items-center gap-2 hover:text-accent">
                {selectedMethod.number} <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Montant</span>
              <button onClick={() => copy(String(offer.price))} className="font-mono font-bold flex items-center gap-2 hover:text-accent">
                {formatFCFA(offer.price)} <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6 shadow-card">
          <h2 className="font-semibold mb-3">2. Enregistre ta demande</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="payer_phone">Numéro avec lequel tu as payé</Label>
              <Input id="payer_phone" name="payer_phone" placeholder="ex : 6XX XX XX XX" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proof">Preuve de paiement (capture d'écran)</Label>
              <Input id="proof" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note (optionnel)</Label>
              <Textarea id="note" name="note" rows={2} maxLength={500} placeholder="Référence transaction, message..." />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer ma demande
            </Button>
          </form>
        </Card>

        <Card className="p-6 shadow-card border-2 border-[#25D366]/30 bg-[#25D366]/5">
          <h2 className="font-semibold mb-2">3. Active ton compte sur WhatsApp ⚡</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Après paiement, contacte-nous sur WhatsApp pour activer ton compte rapidement (<strong>moins de 5 minutes</strong>).
          </p>
          <WhatsAppButton message={waMessage} label="Envoyer la preuve sur WhatsApp" size="lg" className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white" />
        </Card>
      </main>
    </div>
  );
};

export default Payment;
