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

const Payment = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const offerKey = (params.get("offer") as OfferKey) || "sub_1m";
  const offer = OFFERS[offerKey];
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

        <Card className="p-6 mb-6 shadow-card border-2 border-accent/40 bg-accent/5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-accent" />
            <h2 className="font-semibold">Paiement automatique — activation instantanée</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Ton compte est activé immédiatement après confirmation, sans intervention manuelle.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
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
      </main>
    </div>
  );
};

export default Payment;
