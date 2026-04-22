import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator as CalcIcon, Target, ShieldCheck, AlertTriangle, TrendingUp } from "lucide-react";

// Standard pip values (USD-quoted) for a 1.00 standard lot.
// JPY pairs : pip = 0.01 ; autres : 0.0001 — pip value approx en USD.
const PIP_VALUE_PER_LOT: Record<string, number> = {
  STANDARD: 10,   // EUR/USD, GBP/USD, AUD/USD, NZD/USD…
  JPY: 9.3,       // USD/JPY ~ 1000/USDJPY ; valeur approchée
  XAU: 10,        // 0.10 = 1 pip → 1 lot = 100oz → ~10$/0.10
  INDICES: 1,     // 1 point = 1$ (approximation)
};

const PAIRS = [
  { v: "STANDARD", label: "EUR/USD · GBP/USD · AUD/USD…" },
  { v: "JPY", label: "USD/JPY · EUR/JPY · GBP/JPY" },
  { v: "XAU", label: "XAU/USD (Or)" },
  { v: "INDICES", label: "Indices (US30, NAS100…)" },
];

export default function Calculator() {
  const [capital, setCapital] = useState<string>("1000");
  const [risk, setRisk] = useState<string>("1");
  const [sl, setSl] = useState<string>("20");
  const [pair, setPair] = useState<string>("STANDARD");

  const result = useMemo(() => {
    const cap = parseFloat(capital) || 0;
    const r = parseFloat(risk) || 0;
    const slPips = parseFloat(sl) || 0;
    const pipValue = PIP_VALUE_PER_LOT[pair] ?? 10;
    const riskAmount = (cap * r) / 100;
    const lot = slPips > 0 && pipValue > 0 ? riskAmount / (slPips * pipValue) : 0;
    return {
      riskAmount: Math.round(riskAmount * 100) / 100,
      lot: Math.round(lot * 1000) / 1000,
      microLot: Math.round(lot * 100000), // unités
    };
  }, [capital, risk, sl, pair]);

  const riskWarn = parseFloat(risk) > 2;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AppHeader />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <main className="container relative py-6 md:py-10 max-w-3xl">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary font-mono mb-2">
          <CalcIcon className="h-3 w-3" /> Outil
        </div>
        <h1 className="font-display text-2xl md:text-4xl font-bold mb-2">Calculateur de position</h1>
        <p className="text-muted-foreground mb-6">🎯 Risque maîtrisé = trading professionnel</p>

        <div className="grid md:grid-cols-2 gap-5">
          {/* FORM */}
          <Card className="glass-strong p-5 space-y-4">
            <Field label="Capital ($)" hint="Le solde total de ton compte">
              <Input type="number" min="0" step="any" value={capital} onChange={(e) => setCapital(e.target.value)} className="h-11 bg-background/40 font-display text-lg" />
            </Field>
            <Field label="Risque par trade (%)" hint="Recommandé : 0.5% à 2% maximum">
              <Input type="number" min="0" step="0.1" value={risk} onChange={(e) => setRisk(e.target.value)} className="h-11 bg-background/40 font-display text-lg" />
              {riskWarn && (
                <p className="text-xs text-amber-400 inline-flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" /> Risque élevé : un pro reste sous 2%.
                </p>
              )}
            </Field>
            <Field label="Stop Loss (pips)" hint="Distance entre ton entrée et ton SL">
              <Input type="number" min="0" step="1" value={sl} onChange={(e) => setSl(e.target.value)} className="h-11 bg-background/40 font-display text-lg" />
            </Field>
            <Field label="Type d'instrument">
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger className="h-11 bg-background/40"><SelectValue /></SelectTrigger>
                <SelectContent>{PAIRS.map(p => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </Card>

          {/* RESULT */}
          <Card className="glass-strong p-5 border border-primary/30 shadow-[0_0_40px_-20px_hsl(var(--primary))]">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-primary" />
              <div className="font-display font-bold">Résultat</div>
            </div>

            <Stat label="Taille de lot recommandée" value={result.lot.toFixed(3)} unit="lot(s)" big />
            <div className="text-xs text-muted-foreground mt-1 mb-5 font-mono">≈ {result.microLot.toLocaleString("fr-FR")} unités</div>

            <Stat label="Montant risqué" value={`$${result.riskAmount.toFixed(2)}`} />

            <div className="mt-5 pt-5 border-t border-border/50 space-y-2 text-xs">
              <Row icon={ShieldCheck} text="Tu ne perdras jamais plus que ce montant si ton SL est respecté." />
              <Row icon={TrendingUp} text="Reste constant : un trader pro ne change pas son % à chaque trade." />
            </div>
          </Card>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6 italic">
          « Les meilleurs traders sont ceux qui analysent leurs erreurs. »
        </p>
      </main>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
function Stat({ label, value, unit, big }: { label: string; value: string; unit?: string; big?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{label}</div>
      <div className={`font-display font-bold ${big ? "text-3xl md:text-4xl text-gradient-cyan" : "text-xl"}`}>
        {value} {unit && <span className="text-sm text-muted-foreground font-normal">{unit}</span>}
      </div>
    </div>
  );
}
function Row({ icon: I, text }: { icon: any; text: string }) {
  return <div className="flex items-start gap-2 text-muted-foreground"><I className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /><span>{text}</span></div>;
}
