import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { OFFERS, formatFCFA } from "@/lib/constants";
import { BarChart3, BookOpen, Brain, CheckCircle2, GraduationCap, LineChart, Smartphone, TrendingUp } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-[0.97]" />
        <div className="container relative py-20 md:py-28 text-primary-foreground">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium mb-5 backdrop-blur">
              📊 Pour traders en Afrique centrale
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] mb-5">
              Le journal de trading qui te fait vraiment progresser.
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl">
              Garde un historique clair de tes trades, analyse tes performances, comprends tes erreurs et améliore ta discipline — avec le suivi d'un coach.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
                <Link to="/auth?mode=signup">🎓 Rejoindre la formation — {formatFCFA(20000)}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white">
                <Link to="/subscribe">📊 S'abonner au journal</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="container py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-7 shadow-card">
            <h2 className="text-2xl font-bold mb-4">😩 Le problème</h2>
            <p className="text-muted-foreground mb-4">La plupart des traders perdent de l'argent parce qu'ils&nbsp;:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><span className="text-loss">✗</span> n'analysent pas leurs trades</li>
              <li className="flex gap-2"><span className="text-loss">✗</span> répètent les mêmes erreurs</li>
              <li className="flex gap-2"><span className="text-loss">✗</span> n'ont aucun suivi de performance</li>
            </ul>
          </Card>
          <Card className="p-7 shadow-card border-accent/20">
            <h2 className="text-2xl font-bold mb-4">✨ La solution</h2>
            <p className="text-muted-foreground mb-4">Avec MasterLogPro, tu peux&nbsp;:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain shrink-0 mt-0.5" /> Enregistrer tous tes trades (technique + fondamental)</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain shrink-0 mt-0.5" /> Suivre ton win rate et tes performances</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain shrink-0 mt-0.5" /> Identifier tes erreurs récurrentes</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain shrink-0 mt-0.5" /> Recevoir un feedback du coach (formation)</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-secondary/40 py-16 md:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Tout ce dont tu as besoin</h2>
            <p className="text-muted-foreground">Une plateforme simple, complète, mobile friendly.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: "Journal complet", desc: "Date, paire, direction, SL/TP, lot, screenshot, commentaires." },
              { icon: BarChart3, title: "Statistiques avancées", desc: "Win rate, gain/perte, profit factor, courbe de capital." },
              { icon: Brain, title: "Analyse fondamentale", desc: "News, impact, sentiment, sources — comprends le marché." },
              { icon: GraduationCap, title: "Coaching", desc: "Feedback du coach sur tes trades (formation)." },
              { icon: TrendingUp, title: "Tag d'erreurs", desc: "Mauvais timing, overtrading, mauvaise analyse." },
              { icon: Smartphone, title: "Mobile friendly", desc: "Utilisable depuis ton téléphone, partout." },
            ].map((f) => (
              <Card key={f.title} className="p-6 shadow-card">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* OFFERS */}
      <section className="container py-16 md:py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Choisis ton offre</h2>
          <p className="text-muted-foreground">Paiement Mobile Money — activation rapide via WhatsApp.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="p-7 shadow-elevated border-2 border-accent relative">
            <span className="absolute top-4 right-4 text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-medium">RECOMMANDÉ</span>
            <GraduationCap className="h-8 w-8 text-accent mb-3" />
            <h3 className="text-xl font-bold mb-1">{OFFERS.formation.label}</h3>
            <div className="text-3xl font-bold mb-3">{formatFCFA(OFFERS.formation.price)}</div>
            <p className="text-sm text-muted-foreground mb-4">{OFFERS.formation.description}</p>
            <ul className="space-y-1.5 text-sm mb-6">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain mt-0.5" /> Journal de trading complet</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain mt-0.5" /> Statistiques avancées (profit factor, news)</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain mt-0.5" /> Exercices et corrections</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain mt-0.5" /> Feedback du coach</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-gain mt-0.5" /> Accès illimité</li>
            </ul>
            <Button className="w-full" size="lg" asChild>
              <Link to="/subscribe?offer=formation">Commencer la formation</Link>
            </Button>
          </Card>

          <Card className="p-7 shadow-card">
            <LineChart className="h-8 w-8 text-primary mb-3" />
            <h3 className="text-xl font-bold mb-1">Abonnement Journal</h3>
            <div className="text-3xl font-bold mb-3">dès {formatFCFA(5000)}</div>
            <p className="text-sm text-muted-foreground mb-4">Accès au journal de trading. Plusieurs durées au choix.</p>
            <ul className="space-y-1.5 text-sm mb-6">
              <li className="flex justify-between"><span>1 mois</span><span className="font-semibold">{formatFCFA(5000)}</span></li>
              <li className="flex justify-between"><span>3 mois</span><span className="font-semibold">{formatFCFA(12500)}</span></li>
              <li className="flex justify-between"><span>6 mois</span><span className="font-semibold">{formatFCFA(25000)}</span></li>
              <li className="flex justify-between"><span>12 mois</span><span className="font-semibold">{formatFCFA(100000)}</span></li>
            </ul>
            <Button variant="outline" className="w-full" size="lg" asChild>
              <Link to="/subscribe">Voir les abonnements</Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-primary text-primary-foreground py-16 md:py-20">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { n: "1", t: "Inscris-toi", d: "Crée ton compte en 30 secondes" },
              { n: "2", t: "Choisis ton offre", d: "Formation ou abonnement" },
              { n: "3", t: "Paye via Mobile Money", d: "MTN, Orange ou Airtel" },
              { n: "4", t: "Active via WhatsApp", d: "Validation en moins de 5 min" },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/10 backdrop-blur font-bold text-xl mb-3">{s.n}</div>
                <h3 className="font-semibold mb-1">{s.t}</h3>
                <p className="text-sm text-white/70">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <WhatsAppButton message="Bonjour, j'aimerais en savoir plus sur MasterLogPro." label="💬 Une question ? Écris-nous" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 md:py-24 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Commence à progresser dès aujourd'hui</h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
          👉 Suis tes trades · 👉 Comprends tes erreurs · 👉 Deviens un trader discipliné
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button size="lg" asChild>
            <Link to="/auth?mode=signup">🎓 Commencer la formation</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/subscribe">📊 S'abonner maintenant</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} MasterLogPro. Plateforme dédiée aux traders d'Afrique centrale.
      </footer>
    </div>
  );
};

export default Index;
