import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OFFERS, formatFCFA } from "@/lib/constants";
import {
  ArrowRight, ArrowUpRight, BarChart3, Brain, CheckCircle2, GraduationCap,
  LineChart, Sparkles, TrendingUp, Zap, Activity, Target, Shield, ChevronRight,
  Trophy, Globe2, Newspaper
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden noise">
      <AppHeader />

      {/* ╔══════════════════════════════════════════════════════════╗
          ║  HERO — cinematic cockpit                                 ║
          ╚══════════════════════════════════════════════════════════╝ */}
      <section className="relative pt-20 pb-32 md:pt-28 md:pb-40">
        {/* Aurora orbs */}
        <div className="absolute top-20 -left-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] animate-pulse-glow" />
        <div className="absolute top-40 -right-32 h-[500px] w-[500px] rounded-full bg-accent/20 blur-[120px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 grid-bg opacity-40" />

        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-[11px] font-medium tracking-[0.15em] uppercase mb-8 animate-fade-up">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-muted-foreground">Live</span>
              <span className="h-3 w-px bg-border" />
              <span className="text-foreground">Trading Cockpit · Afrique Centrale</span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-[88px] font-bold leading-[0.95] mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              Le journal qui transforme<br />
              <span className="text-gradient-brand">tes trades</span> en <span className="italic font-light">discipline.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
              Analyse chaque entrée, chaque sortie. Identifie tes patterns gagnants.
              Recois le feedback d'un coach. Deviens le trader que tu veux être.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <Button size="lg" asChild className="bg-gradient-brand text-primary-foreground hover:opacity-95 border-0 font-semibold h-12 px-7 glow-cyan">
                <Link to="/auth?mode=signup">
                  Commencer gratuitement <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-7 glass border-border/60 hover:bg-secondary/70">
                <Link to="/subscribe">Voir les offres</Link>
              </Button>
            </div>

            {/* Stat strip */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm animate-fade-up" style={{ animationDelay: '0.4s' }}>
              {[
                { v: "+200", l: "Traders actifs" },
                { v: "15K+", l: "Trades enregistrés" },
                { v: "5 min", l: "Activation moyenne" },
              ].map((s) => (
                <div key={s.l} className="flex items-center gap-2.5">
                  <div className="font-display text-2xl font-bold text-gradient-cyan">{s.v}</div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cockpit preview */}
          <CockpitPreview />
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════════╗
          ║  PROBLEM / SOLUTION                                       ║
          ╚══════════════════════════════════════════════════════════╝ */}
      <section className="container py-20 md:py-28 relative">
        <SectionLabel num="01" label="Le constat" />
        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <div className="glass rounded-2xl p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-loss/10 blur-3xl" />
            <div className="text-loss text-xs font-mono tracking-widest uppercase mb-4">Sans journal</div>
            <h3 className="font-display text-3xl font-bold mb-5">
              Tu trades à <span className="text-loss">l'aveugle.</span>
            </h3>
            <ul className="space-y-3.5 text-[15px]">
              {[
                "Tu répètes les mêmes erreurs sans le savoir",
                "Aucune idée de ton vrai win rate",
                "Tu ne sais pas pourquoi tu gagnes (ou perds)",
                "Pas de progression mesurable",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-muted-foreground">
                  <span className="text-loss mt-0.5 font-mono">×</span>{t}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-8 md:p-10 relative overflow-hidden ring-cyan">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-gain/15 blur-3xl" />
            <div className="text-primary text-xs font-mono tracking-widest uppercase mb-4">Avec MasterLogPro</div>
            <h3 className="font-display text-3xl font-bold mb-5">
              Tu deviens <span className="text-gradient-cyan">méthodique.</span>
            </h3>
            <ul className="space-y-3.5 text-[15px]">
              {[
                "Chaque trade documenté : technique + fondamental",
                "Stats temps réel : win rate, profit factor, P&L",
                "Tags d'erreurs pour identifier tes patterns",
                "Coach humain qui analyse tes trades (formation)",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-gain shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════════╗
          ║  FEATURES                                                 ║
          ╚══════════════════════════════════════════════════════════╝ */}
      <section className="relative py-20 md:py-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="container relative">
          <SectionLabel num="02" label="Le cockpit" />
          <div className="mt-10 mb-14 max-w-2xl">
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              Tout ton trading,<br />
              <span className="text-gradient-cyan">dans une seule interface.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: BarChart3, title: "Statistiques live", desc: "Win rate, profit factor, courbe d'équité, P&L par paire." },
              { icon: Brain, title: "Analyse fondamentale", desc: "News, impact, sentiment, sources — comprends le marché." },
              { icon: Target, title: "Tags d'erreurs", desc: "Mauvais timing, overtrading, FOMO. Identifie tes patterns." },
              { icon: GraduationCap, title: "Feedback coach", desc: "Un trader pro analyse tes trades et te corrige." },
              { icon: Activity, title: "Screenshots", desc: "Joins ton chart à chaque trade pour le revoir plus tard." },
              { icon: Zap, title: "Mobile-first", desc: "Saisie en 30 secondes depuis ton téléphone, partout." },
            ].map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.05} />
            ))}
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════════╗
          ║  TWO PATHS — Étudiant vs Abonné (CRITICAL DIFFERENTIATION)║
          ╚══════════════════════════════════════════════════════════╝ */}
      <section className="container py-20 md:py-28 relative">
        <SectionLabel num="03" label="Deux parcours" />
        <div className="mt-10 mb-14 text-center max-w-2xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-4">
            Choisis ton <span className="italic font-light">niveau d'engagement.</span>
          </h2>
          <p className="text-muted-foreground">Deux univers distincts. Deux ambitions différentes.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* STUDENT — Gold/Amber */}
          <PathCard
            tone="student"
            kicker="Formation complète"
            title="Devenir trader."
            price={formatFCFA(OFFERS.formation.price)}
            priceNote="Formation 50 000 + Accès plateforme 20 000 · paiement unique"
            description="Tu veux apprendre vraiment. Tu veux qu'un coach analyse tes trades. Tu veux des exercices et un cadre."
            features={[
              "Formation trading complète (50 000 FCFA)",
              "Accès plateforme illimité (20 000 FCFA)",
              "Stats avancées + analyse fondamentale",
              "Exercices structurés et corrigés",
              "Feedback personnel du coach",
            ]}
            cta="Rejoindre la formation"
            href="/subscribe?offer=formation"
          />

          {/* SUBSCRIBER — Cyan */}
          <PathCard
            tone="subscriber"
            kicker="Abonnement Journal"
            title="Suivre tes trades."
            price={`dès ${formatFCFA(5000)}`}
            priceNote="Mensuel · trimestriel · annuel"
            description="Tu sais déjà trader. Tu veux juste un outil pro pour documenter et mesurer ta performance."
            features={[
              "Journal de trading complet",
              "Statistiques temps réel",
              "Analyse fondamentale",
              "Screenshots et notes",
              "Plusieurs durées au choix",
            ]}
            cta="Voir les abonnements"
            href="/subscribe"
          />
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════════╗
          ║  HOW IT WORKS                                             ║
          ╚══════════════════════════════════════════════════════════╝ */}
      <section className="relative py-20 md:py-28">
        <div className="absolute inset-0 bg-aurora opacity-20 blur-3xl" />
        <div className="container relative">
          <SectionLabel num="04" label="Process" />
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-10 mb-14 max-w-3xl">
            De l'inscription au premier trade.<br />
            <span className="text-gradient-cyan">Cinq minutes.</span>
          </h2>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { n: "01", t: "Inscription", d: "Crée ton compte en 30 secondes." },
              { n: "02", t: "Choix offre", d: "Formation ou abonnement." },
              { n: "03", t: "Mobile Money", d: "MTN, Orange, Airtel." },
              { n: "04", t: "Activation", d: "Validation WhatsApp en 5 min." },
            ].map((s, i) => (
              <div key={s.n} className="glass rounded-xl p-6 relative group hover:ring-cyan transition-all">
                <div className="font-mono text-xs text-primary mb-3">{s.n}</div>
                <div className="font-display text-xl font-bold mb-1.5">{s.t}</div>
                <div className="text-sm text-muted-foreground">{s.d}</div>
                {i < 3 && (
                  <ChevronRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-border" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <WhatsAppButton message="Bonjour, j'aimerais en savoir plus sur MasterLogPro." label="Une question ? Écris-nous sur WhatsApp" />
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════════════════════════╗
          ║  FINAL CTA                                                ║
          ╚══════════════════════════════════════════════════════════╝ */}
      <section className="container py-24 md:py-32 relative">
        <div className="relative overflow-hidden rounded-3xl glass-strong p-10 md:p-16 text-center">
          <div className="absolute inset-0 bg-aurora opacity-30 animate-spin-slow" />
          <div className="relative">
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-5" />
            <h2 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-5">
              Commence à <span className="text-gradient-brand">progresser</span><br />dès aujourd'hui.
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Suis tes trades. Comprends tes erreurs. Deviens un trader discipliné.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild className="bg-gradient-gold text-student-foreground hover:opacity-95 border-0 font-semibold h-12 px-7 glow-gold">
                <Link to="/subscribe?offer=formation">
                  <GraduationCap className="h-4 w-4" /> Formation complète
                </Link>
              </Button>
              <Button size="lg" asChild className="bg-gradient-subscriber text-subscriber-foreground hover:opacity-95 border-0 font-semibold h-12 px-7 glow-cyan">
                <Link to="/subscribe">
                  <LineChart className="h-4 w-4" /> Abonnement Journal
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/50 py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-brand text-primary-foreground">
              <Activity className="h-3 w-3" />
            </div>
            <span>© {new Date().getFullYear()} MasterLogPro · Trading Cockpit</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5" />
            <span>Paiement sécurisé · Mobile Money · Afrique Centrale</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════ */

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="font-mono text-xs text-primary">{num}</div>
      <div className="h-px flex-1 max-w-[60px] bg-border" />
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon: Icon, title, desc, delay,
}: { icon: any; title: string; desc: string; delay: number }) {
  return (
    <div
      className="group relative glass rounded-2xl p-6 transition-all hover:bg-surface-elevated/60 hover:-translate-y-0.5 animate-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary/15 transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
      </div>
      <h3 className="font-display text-lg font-bold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function PathCard({
  tone, kicker, title, price, priceNote, description, features, cta, href,
}: {
  tone: "student" | "subscriber";
  kicker: string; title: string; price: string; priceNote: string;
  description: string; features: string[]; cta: string; href: string;
}) {
  const isStudent = tone === "student";
  return (
    <div className={`relative group rounded-3xl p-8 md:p-10 overflow-hidden glass ${isStudent ? "ring-gold" : "ring-cyan"}`}>
      {/* aurora bg */}
      <div className={`absolute -top-32 -right-32 h-80 w-80 rounded-full blur-3xl opacity-30 ${isStudent ? "bg-student" : "bg-subscriber"}`} />
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative">
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] mb-6 ${isStudent ? "bg-student/15 text-student border border-student/30" : "bg-subscriber/15 text-subscriber border border-subscriber/30"}`}>
          {isStudent ? <GraduationCap className="h-3 w-3" /> : <LineChart className="h-3 w-3" />}
          {kicker}
        </div>

        <h3 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
          <span className={isStudent ? "text-gradient-gold" : "text-gradient-cyan"}>{title}</span>
        </h3>

        <p className="text-muted-foreground mb-7 max-w-md">{description}</p>

        <div className="flex items-baseline gap-3 mb-7">
          <div className="font-display text-4xl font-bold">{price}</div>
          <div className="text-xs text-muted-foreground">{priceNote}</div>
        </div>

        <ul className="space-y-2.5 mb-8">
          {features.map((f) => (
            <li key={f} className="flex gap-3 text-sm">
              <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${isStudent ? "text-student" : "text-subscriber"}`} />
              <span className="text-foreground/90">{f}</span>
            </li>
          ))}
        </ul>

        <Button asChild size="lg" className={`w-full h-12 border-0 font-semibold ${isStudent ? "bg-gradient-gold text-student-foreground glow-gold" : "bg-gradient-subscriber text-subscriber-foreground glow-cyan"}`}>
          <Link to={href}>
            {cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

/* Cockpit preview — mock terminal */
function CockpitPreview() {
  return (
    <div className="mt-20 max-w-5xl mx-auto animate-fade-up" style={{ animationDelay: '0.5s' }}>
      <div className="relative">
        {/* Glow */}
        <div className="absolute -inset-4 bg-gradient-brand opacity-20 blur-3xl rounded-3xl" />

        {/* Frame */}
        <div className="relative glass-strong rounded-2xl overflow-hidden shadow-elevated">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-loss/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-gain/60" />
            </div>
            <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">masterlogpro · cockpit</div>
            <div className="font-mono text-[10px] text-primary">● LIVE</div>
          </div>

          {/* Body */}
          <div className="p-5 md:p-7 grid md:grid-cols-3 gap-4">
            <MiniStat label="Win rate" value="68%" trend="+4.2%" up />
            <MiniStat label="Profit factor" value="2.31" trend="+0.18" up />
            <MiniStat label="P&L 30j" value="+$2,847" trend="+12.4%" up accent />
          </div>

          {/* Trade row */}
          <div className="px-5 md:px-7 pb-5 md:pb-7">
            <div className="rounded-xl bg-background/40 border border-border/50 overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border/50">
                <div className="col-span-3">Pair</div>
                <div className="col-span-2">Dir</div>
                <div className="col-span-3">Entry</div>
                <div className="col-span-2">Result</div>
                <div className="col-span-2 text-right">Status</div>
              </div>
              {[
                { p: "EUR/USD", d: "BUY", e: "1.0842", r: "+$340", s: "WIN" },
                { p: "XAU/USD", d: "SELL", e: "2,041.5", r: "+$1,205", s: "WIN" },
                { p: "GBP/JPY", d: "BUY", e: "189.45", r: "−$120", s: "LOSS" },
              ].map((t) => (
                <div key={t.p} className="grid grid-cols-12 px-4 py-2.5 text-xs font-mono border-t border-border/30 first:border-t-0 hover:bg-secondary/20">
                  <div className="col-span-3 font-semibold text-foreground">{t.p}</div>
                  <div className="col-span-2"><span className={t.d === "BUY" ? "text-gain" : "text-loss"}>{t.d}</span></div>
                  <div className="col-span-3 text-muted-foreground">{t.e}</div>
                  <div className={`col-span-2 font-semibold ${t.r.startsWith("+") ? "text-gain" : "text-loss"}`}>{t.r}</div>
                  <div className="col-span-2 text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${t.s === "WIN" ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss"}`}>{t.s}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, trend, up, accent }: { label: string; value: string; trend: string; up?: boolean; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? "bg-primary/5 border-primary/30" : "bg-background/40 border-border/50"}`}>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1 ${accent ? "text-gradient-cyan" : ""}`}>{value}</div>
      <div className={`text-xs mt-0.5 inline-flex items-center gap-1 ${up ? "text-gain" : "text-loss"}`}>
        <TrendingUp className="h-3 w-3" />{trend}
      </div>
    </div>
  );
}

export default Index;
