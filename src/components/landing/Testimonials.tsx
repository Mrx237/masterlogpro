import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Yannick M.",
    role: "Trader Forex · Douala",
    avatar: "YM",
    text: "Avant MasterLogPro je tradais à l'instinct. En 3 mois j'ai identifié 2 erreurs qui me coûtaient 70% de mes pertes. Mon win rate est passé de 41% à 63%.",
    rating: 5,
    badge: "Formation",
  },
  {
    name: "Aïcha B.",
    role: "Swing trader · Libreville",
    avatar: "AB",
    text: "Le feedback du coach change tout. Il ne te dit pas juste 'c'est bien', il te montre exactement où tu as raté la lecture du contexte. C'est ça qui m'a fait progresser.",
    rating: 5,
    badge: "Formation",
  },
  {
    name: "Patrick N.",
    role: "Day trader Indices · Yaoundé",
    avatar: "PN",
    text: "L'interface mobile est ce que j'attendais depuis longtemps. Je log un trade en 20 secondes entre deux sessions. Les stats temps réel me forcent à rester discipliné.",
    rating: 5,
    badge: "Abonné",
  },
  {
    name: "Sandrine K.",
    role: "Trader XAU/USD · Brazzaville",
    avatar: "SK",
    text: "Le calendrier news intégré + les tags d'erreurs = je ne trade plus à l'aveugle pendant les NFP. Sérieux, c'est devenu mon premier réflexe le matin.",
    rating: 5,
    badge: "Abonnée",
  },
  {
    name: "Junior T.",
    role: "Trader débutant · Bangui",
    avatar: "JT",
    text: "J'ai pris la formation en sortant de la fac. 6 mois plus tard, j'ai un système clair, des règles écrites, et je gère mon premier compte funded. Merci coach.",
    rating: 5,
    badge: "Formation",
  },
  {
    name: "Cédric A.",
    role: "Scalper EUR/USD · N'Djamena",
    avatar: "CA",
    text: "Ce qui m'a marqué : la communauté. Le classement mensuel m'a poussé à être plus rigoureux. Mon profit factor a doublé en 2 saisons.",
    rating: 5,
    badge: "Abonné",
  },
];

export function Testimonials() {
  return (
    <section className="container py-20 md:py-28 relative">
      <div className="flex items-center gap-3 mb-3">
        <div className="font-mono text-xs text-primary">06</div>
        <div className="h-px flex-1 max-w-[60px] bg-border" />
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Témoignages</div>
      </div>

      <div className="mt-10 mb-14 max-w-2xl">
        <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">
          Ils ont transformé<br />
          <span className="text-gradient-brand">leur trading.</span>
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Plus de 200 traders en Afrique Centrale utilisent MasterLogPro pour devenir constants.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t, i) => (
          <article
            key={t.name}
            className="group relative glass rounded-2xl p-6 hover:bg-surface-elevated/60 hover:-translate-y-0.5 transition-all animate-fade-up"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Quote className="absolute top-5 right-5 h-5 w-5 text-primary/30" />

            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: t.rating }).map((_, idx) => (
                <Star key={idx} className="h-3.5 w-3.5 fill-warn text-warn" />
              ))}
            </div>

            <p className="text-[15px] leading-relaxed text-foreground/90 mb-6">
              « {t.text} »
            </p>

            <div className="flex items-center gap-3 pt-4 border-t border-border/50">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-primary-foreground font-bold text-sm shrink-0">
                {t.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground truncate">{t.role}</div>
              </div>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded ${
                  t.badge === "Formation"
                    ? "bg-student/15 text-student border border-student/30"
                    : "bg-subscriber/15 text-subscriber border border-subscriber/30"
                }`}
              >
                {t.badge}
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Trust strip */}
      <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { v: "4.9/5", l: "Note moyenne" },
          { v: "200+", l: "Traders actifs" },
          { v: "15 000+", l: "Trades loggés" },
          { v: "92%", l: "Renouvellent" },
        ].map((s) => (
          <div key={s.l} className="glass rounded-xl p-5 text-center">
            <div className="font-display text-3xl font-bold text-gradient-cyan">{s.v}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
