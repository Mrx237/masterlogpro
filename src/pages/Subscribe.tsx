import { Link, useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { OFFERS, OfferKey, formatFCFA } from "@/lib/constants";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  ArrowRight, CheckCircle2, GraduationCap, LineChart, Sparkles,
  MessageCircle, Crown, Calendar, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PromoBadge } from "@/components/PromoBadge";

const SUBS: { key: OfferKey; badge?: string; savings?: string }[] = [
  { key: "sub_1m" },
  { key: "sub_3m", savings: "−17%" },
  { key: "sub_6m", badge: "POPULAIRE", savings: "−17%" },
  { key: "sub_12m", savings: "Best deal" },
];

const Subscribe = () => {
  const [params] = useSearchParams();
  const highlight = params.get("offer") as OfferKey | null;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden noise">
      <AppHeader />

      {/* HERO */}
      <section className="container relative pt-12 pb-8 md:pt-20 md:pb-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[11px] font-medium tracking-[0.15em] uppercase mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            Choisis ton parcours
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] mb-5">
            Un seul prix.<br />
            <span className="text-gradient-brand">Pour tous les traders.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            1 500 FCFA par mois, du débutant au pro. Paiement Mobile Money, activation en 5 minutes.
          </p>
        </div>
      </section>

      <main className="container pb-24 space-y-16">

        {/* ╔═══════════════════════════════════════════════════════╗
            ║  SUBSCRIBER PATH — Cyan/Blue                            ║
            ╚═══════════════════════════════════════════════════════╝ */}
        <section className="relative">
          <PathHeader
            num="01"
            tone="subscriber"
            label="Parcours Abonné"
            title="Suivre tes trades."
            subtitle="Débutant comme pro : un outil pro pour progresser."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUBS.map(({ key, badge, savings }) => {
              const o = OFFERS[key];
              const isHighlight = highlight === key || badge === "POPULAIRE";
              const months = o.durationDays! / 30;
              return (
                <div
                  key={key}
                  className={cn(
                    "relative group rounded-2xl p-6 transition-all hover:-translate-y-1",
                    isHighlight ? "glass-strong ring-cyan" : "glass hover:bg-surface-elevated/60"
                  )}
                >
                  {badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-subscriber text-subscriber-foreground text-[9px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full glow-cyan">
                      {badge}
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-subscriber/15 border border-subscriber/30">
                      <Calendar className="h-4 w-4 text-subscriber" />
                    </div>
                    {savings && (
                      <span className="text-[10px] font-mono text-subscriber bg-subscriber/10 border border-subscriber/30 px-2 py-0.5 rounded">
                        {savings}
                      </span>
                    )}
                  </div>

                  <div className="font-display text-3xl font-bold leading-none">
                    {Math.round(months)}<span className="text-base text-muted-foreground font-normal"> mois</span>
                  </div>

                  <div className="mt-4 pb-4 border-b border-border/50">
                    <div className="font-display text-2xl font-bold text-gradient-cyan">
                      {formatFCFA(o.price).replace(" FCFA", "")}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      FCFA · {Math.round(o.price / months).toLocaleString("fr-FR")}/mois
                    </div>
                  </div>

                  <PromoBadge offerKey={key} tone="cyan" className="mt-3" />

                  <Button
                    asChild
                    variant="outline"
                    className={cn(
                      "w-full mt-4 border-subscriber/40 text-subscriber hover:bg-subscriber/10 hover:text-subscriber",
                      isHighlight && "bg-gradient-subscriber text-subscriber-foreground border-0 glow-cyan hover:opacity-95"
                    )}
                  >
                    <Link to={`/payment?offer=${key}`}>Choisir</Link>
                  </Button>
                </div>
              );
            })}
          </div>

          {/* What's included */}
          <div className="mt-8 glass rounded-2xl p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-subscriber mb-3">
                  <LineChart className="h-3 w-3" /> Inclus dans tous les abonnements
                </div>
                <h3 className="font-display text-2xl font-bold mb-2">
                  Le cockpit complet,<br />pour 1 500 FCFA/mois.
                </h3>
                <p className="text-sm text-muted-foreground">
                  Débutant ou pro, tu as accès à tout le journal et aux statistiques.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                {[
                  "Journal complet",
                  "Stats temps réel",
                  "Analyse fondamentale",
                  "Screenshots & notes",
                  "Tags d'erreurs",
                  "Mobile-first",
                ].map((f) => (
                  <div key={f} className="flex gap-2 text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-subscriber shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Help / WhatsApp ─── */}
        <section className="relative">
          <div className="relative overflow-hidden rounded-2xl glass-strong p-6 md:p-8">
            <div className="absolute inset-0 bg-aurora opacity-10" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/30 shrink-0">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold mb-1">Une question avant de payer ?</h3>
                  <p className="text-sm text-muted-foreground">Notre équipe répond rapidement sur WhatsApp.</p>
                </div>
              </div>
              <WhatsAppButton message="Bonjour, j'aimerais des informations sur MasterLogPro avant de payer." label="Discuter sur WhatsApp" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground font-mono uppercase tracking-wider">
        © {new Date().getFullYear()} MasterLogPro · Mobile Money · Afrique Centrale
      </footer>
    </div>
  );
};

function PathHeader({
  num, tone, label, title, subtitle,
}: { num: string; tone: "student" | "subscriber"; label: string; title: string; subtitle: string }) {
  const isStudent = tone === "student";
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className={cn("font-mono text-xs", isStudent ? "text-student" : "text-subscriber")}>{num}</div>
        <div className={cn("h-px flex-1 max-w-[60px]", isStudent ? "bg-student/40" : "bg-subscriber/40")} />
        <div className={cn("text-[10px] uppercase tracking-[0.2em] font-mono", isStudent ? "text-student" : "text-subscriber")}>
          {label}
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight">
          {title.split(" ").map((word, i) =>
            i === 0
              ? <span key={i} className={isStudent ? "text-gradient-gold" : "text-gradient-cyan"}>{word} </span>
              : <span key={i} className="italic font-light">{word} </span>
          )}
        </h2>
        <p className="text-muted-foreground md:text-right md:max-w-sm">{subtitle}</p>
      </div>
    </div>
  );
}

export default Subscribe;
