import { ShieldCheck, Headphones, Smartphone, Lock, Clock, RefreshCw } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Garantie satisfait",
    desc: "7 jours pour tester. Pas convaincu ? On rembourse, sans question.",
  },
  {
    icon: Lock,
    title: "Paiement sécurisé",
    desc: "Mobile Money via NowPayments. Tes infos ne transitent jamais en clair.",
  },
  {
    icon: Headphones,
    title: "Support humain",
    desc: "WhatsApp direct avec l'équipe. Réponse moyenne en moins de 2 heures.",
  },
  {
    icon: Smartphone,
    title: "100% mobile",
    desc: "Pensée pour ton téléphone. Saisie d'un trade en 30 secondes.",
  },
  {
    icon: Clock,
    title: "Activation rapide",
    desc: "5 minutes après ton paiement, ton accès est ouvert.",
  },
  {
    icon: RefreshCw,
    title: "Mises à jour incluses",
    desc: "Nouvelles features chaque mois. Sans surcoût, sans réabonnement.",
  },
];

export function Guarantees() {
  return (
    <section className="container py-20 md:py-24 relative">
      <div className="flex items-center gap-3 mb-3">
        <div className="font-mono text-xs text-primary">07</div>
        <div className="h-px flex-1 max-w-[60px] bg-border" />
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Nos engagements</div>
      </div>

      <div className="mt-10 mb-12 max-w-2xl">
        <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">
          On prend les <span className="text-gradient-cyan">risques</span> à ta place.
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ITEMS.map((it, i) => (
          <div
            key={it.title}
            className="glass rounded-2xl p-6 hover:bg-surface-elevated/60 hover:-translate-y-0.5 transition-all animate-fade-up"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 mb-4">
              <it.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold mb-1.5">{it.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
