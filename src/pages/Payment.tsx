import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OFFERS, OfferKey, formatFCFA, MOBILE_MONEY, buildWhatsAppLink } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Smartphone, ArrowLeft, Bitcoin, Copy, CheckCircle2, MessageCircle, Wallet } from "lucide-react";

const Payment = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const offerKey = (params.get("offer") as OfferKey) || "sub_1m";
  const offer = OFFERS[offerKey];

  const [operator, setOperator] = useState<"mtn" | "orange">("mtn");
  const [payerPhone, setPayerPhone] = useState("");
  const [txRef, setTxRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);

  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [cryptoInvoiceUrl, setCryptoInvoiceUrl] = useState<string | null>(null);

  const [credit, setCredit] = useState<number>(0);
  const [creditLoading, setCreditLoading] = useState(false);
  const [payingCredit, setPayingCredit] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate(`/auth?mode=signup`, { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("affiliates")
        .select("balance_fcfa")
        .eq("user_id", user.id)
        .maybeSingle();
      setCredit(data?.balance_fcfa ?? 0);
    })();
  }, [user, submitted]);

  if (!offer) return null;

  const targetNumber = operator === "mtn" ? MOBILE_MONEY.mtn : MOBILE_MONEY.orange;

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  }

  async function submitMomo() {
    if (!user) return;
    if (payerPhone.replace(/\D/g, "").length < 9) { toast.error("Ton numéro est invalide"); return; }
    if (txRef.trim().length < 4) { toast.error("Entre l'ID de la transaction Mobile Money"); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("payment_requests")
        .insert({
          user_id: user.id,
          offer: offerKey,
          amount_fcfa: offer.price,
          amount: offer.price,
          currency: "XAF",
          method: operator,
          provider: "manual",
          status: "pending",
          payer_phone: payerPhone,
          provider_tx_id: txRef.trim(),
          note: `Paiement Mobile Money ${operator.toUpperCase()} vers ${targetNumber}`,
        })
        .select("id")
        .single();
      if (error) throw error;

      setSubmitted({ id: data.id });
      toast.success("Demande envoyée — activation sous peu après vérification.");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
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
      if (!data.invoice_url) throw new Error("Lien NOWPayments indisponible");
      setCryptoInvoiceUrl(data.invoice_url);
      toast.success("Redirection vers la page de paiement...");
      window.location.assign(data.invoice_url);
    } catch (e: any) {
      toast.error(e.message);
      setCryptoLoading(false);
    }
  }

  async function payWithCredit() {
    if (!user) return;
    if (credit < offer.price) { toast.error("Crédit insuffisant"); return; }
    setPayingCredit(true);
    try {
      const { error } = await supabase.rpc("pay_with_affiliate_credit", {
        _offer: offerKey as any,
        _amount_fcfa: offer.price,
      });
      if (error) throw error;
      toast.success("Paiement réussi avec ton crédit affilié 🎉");
      navigate("/dashboard?paid=1");
    } catch (e: any) {
      toast.error(e.message || "Échec du paiement par crédit");
    } finally {
      setPayingCredit(false);
    }
  }

  const waMessage = submitted
    ? `Bonjour, je viens d'envoyer ${formatFCFA(offer.price)} via ${operator.toUpperCase()} Mobile Money pour l'offre "${offer.label}". ID transaction: ${txRef}. Mon numéro: ${payerPhone}. Réf demande: ${submitted.id}`
    : "";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 max-w-3xl">
        <Link to="/subscribe" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour aux offres
        </Link>

        <Card className="p-6 mb-6 shadow-card">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{offer.label}</h1>
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            </div>
            <div className="text-3xl font-bold text-accent">{formatFCFA(offer.price)}</div>
          </div>
        </Card>

        {/* MOBILE MONEY MANUEL */}
        <Card className="p-6 mb-6 shadow-card border-2 border-accent/40 bg-accent/5">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="h-5 w-5 text-accent" />
            <h2 className="font-semibold">Mobile Money (MTN / Orange CM)</h2>
          </div>

          {!submitted ? (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                Envoie le montant exact au numéro ci-dessous, puis renseigne ton numéro et l'ID de la transaction.
                Ton compte sera activé dès vérification (généralement &lt; 30 min).
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button
                  type="button"
                  variant={operator === "mtn" ? "default" : "outline"}
                  onClick={() => setOperator("mtn")}
                >
                  MTN MoMo
                </Button>
                <Button
                  type="button"
                  variant={operator === "orange" ? "default" : "outline"}
                  onClick={() => setOperator("orange")}
                >
                  Orange Money
                </Button>
              </div>

              <div className="rounded-lg border bg-background p-4 space-y-3 mb-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Numéro {operator.toUpperCase()}</div>
                    <div className="text-lg font-mono font-bold">{targetNumber}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copy(targetNumber, "Numéro")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground">Montant exact</div>
                    <div className="text-lg font-bold text-accent">{formatFCFA(offer.price)}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copy(String(offer.price), "Montant")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Ton numéro Mobile Money</Label>
                  <Input
                    placeholder="ex: 6XXXXXXXX"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">ID transaction (reçu SMS)</Label>
                  <Input
                    placeholder="ex: CR250511.1234.A56789"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                  />
                </div>
                <Button onClick={submitMomo} disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirmer mon paiement
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Demande enregistrée</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Notre équipe vérifie ton paiement. Tu recevras une confirmation dès activation.
                Pour accélérer, envoie un message WhatsApp avec ta référence.
              </p>
              <a href={buildWhatsAppLink(waMessage)} target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Notifier sur WhatsApp
                </Button>
              </a>
              <Button variant="ghost" className="w-full" onClick={() => navigate("/dashboard")}>
                Aller au tableau de bord
              </Button>
            </div>
          )}
        </Card>

        {/* CRYPTO */}
        <Card className="p-6 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Bitcoin className="h-5 w-5 text-accent" />
            <h2 className="font-semibold">Cryptomonnaie (BTC, USDT, ETH...)</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Paiement automatique via NOWPayments — activation instantanée après confirmation réseau.
          </p>
          <Button onClick={payCrypto} disabled={cryptoLoading} variant="outline" className="w-full">
            {cryptoLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Payer en crypto
          </Button>
          {cryptoInvoiceUrl && (
            <a
              href={cryptoInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-xs text-accent underline underline-offset-4 mt-2"
            >
              Ouvrir la facture NOWPayments
            </a>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Payment;
