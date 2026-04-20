import { Link, useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OFFERS, OfferKey, formatFCFA } from "@/lib/constants";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CheckCircle2, GraduationCap, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

const SUBS: OfferKey[] = ["sub_1m", "sub_3m", "sub_6m", "sub_12m"];

const Subscribe = () => {
  const [params] = useSearchParams();
  const highlight = params.get("offer") as OfferKey | null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-10 md:py-14">
        <header className="text-center mb-10 max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Choisis ton accès</h1>
          <p className="text-muted-foreground">
            Paye via Mobile Money puis valide ton compte sur WhatsApp en moins de 5 minutes.
          </p>
        </header>

        {/* FORMATION */}
        <Card className={cn("p-6 md:p-8 mb-8 shadow-elevated border-2", highlight === "formation" ? "border-accent" : "border-accent/40")}>
          <div className="grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-6 w-6 text-accent" />
                <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-medium">FORMATION COMPLÈTE</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{OFFERS.formation.label}</h2>
              <p className="text-muted-foreground mb-4">{OFFERS.formation.description}</p>
              <ul className="grid sm:grid-cols-2 gap-1.5 text-sm">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain shrink-0 mt-0.5" /> Journal complet</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain shrink-0 mt-0.5" /> Stats avancées + news</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain shrink-0 mt-0.5" /> Exercices corrigés</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain shrink-0 mt-0.5" /> Feedback du coach</li>
              </ul>
            </div>
            <div className="text-center md:text-right">
              <div className="text-4xl font-bold mb-1">{formatFCFA(OFFERS.formation.price)}</div>
              <div className="text-xs text-muted-foreground mb-4">paiement unique · accès illimité</div>
              <Button size="lg" className="w-full md:w-auto" asChild>
                <Link to={`/payment?offer=formation`}>Payer maintenant</Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* SUBSCRIPTIONS */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LineChart className="h-5 w-5" /> Abonnements Journal</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {SUBS.map((k) => {
            const o = OFFERS[k];
            return (
              <Card key={k} className={cn("p-5 shadow-card flex flex-col", highlight === k && "border-accent border-2")}>
                <h3 className="font-semibold">{o.label}</h3>
                <div className="text-2xl font-bold mt-1 mb-1">{formatFCFA(o.price)}</div>
                <p className="text-xs text-muted-foreground mb-4 flex-1">{o.description}</p>
                <Button variant="outline" asChild>
                  <Link to={`/payment?offer=${k}`}>Choisir</Link>
                </Button>
              </Card>
            );
          })}
        </div>

        <Card className="p-6 bg-secondary/50 border-dashed">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div>
              <h3 className="font-semibold mb-1">Une question avant de payer ?</h3>
              <p className="text-sm text-muted-foreground">Notre équipe répond rapidement sur WhatsApp.</p>
            </div>
            <WhatsAppButton message="Bonjour, j'aimerais des informations sur MasterLogPro avant de payer." label="Discuter sur WhatsApp" />
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Subscribe;
