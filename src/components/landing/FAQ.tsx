import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    q: "Je débute. La formation est-elle vraiment adaptée ?",
    a: "Oui. La formation part de zéro : vocabulaire, lecture de chandeliers, gestion du risque, psychologie, plan de trading. Chaque module est suivi d'exercices corrigés par le coach. Tu progresses à ton rythme.",
  },
  {
    q: "C'est quoi la différence entre la Formation et l'Abonnement ?",
    a: "La Formation = apprendre à trader avec un coach humain qui corrige tes trades (paiement unique 70 000 FCFA, accès plateforme inclus). L'Abonnement = juste l'accès à la plateforme pour journaliser tes trades, à partir de 5 000 FCFA/mois.",
  },
  {
    q: "Comment se passe le paiement Mobile Money ?",
    a: "MTN MoMo, Orange Money et Airtel Money sont supportés via NowPayments (passerelle sécurisée). Tu choisis ton offre, tu reçois les instructions, tu valides depuis ton téléphone. Activation automatique sous 5 minutes.",
  },
  {
    q: "Puis-je annuler à tout moment ?",
    a: "Oui. Aucun engagement, aucun renouvellement automatique sans ton accord. Si tu n'es pas satisfait dans les 7 premiers jours, on rembourse à 100%.",
  },
  {
    q: "Mes données de trading sont-elles privées ?",
    a: "Strictement privées. Chiffrement en transit, base de données protégée par RLS (Row Level Security). Seul toi vois tes trades. Le coach n'y accède que si tu lui partages explicitement.",
  },
  {
    q: "Et si j'ai déjà un journal Excel ?",
    a: "Tu peux importer tes anciens trades. Mais surtout : Excel ne te donne pas de stats live, pas de tags d'erreurs, pas de feedback humain. MasterLogPro fait le travail à ta place.",
  },
  {
    q: "Combien de temps avant de voir des résultats ?",
    a: "La majorité de nos traders identifient leurs 2 plus grandes erreurs dès le premier mois. La progression sur le win rate se mesure généralement entre 6 et 12 semaines.",
  },
  {
    q: "Y a-t-il une version desktop ?",
    a: "L'application est responsive : elle fonctionne parfaitement sur mobile, tablette et desktop. Une APK Android dédiée est aussi disponible pour les utilisateurs avancés.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="container py-20 md:py-28 relative">
      <div className="flex items-center gap-3 mb-3">
        <div className="font-mono text-xs text-primary">08</div>
        <div className="h-px flex-1 max-w-[60px] bg-border" />
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Questions fréquentes</div>
      </div>

      <div className="mt-10 mb-12 max-w-2xl">
        <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">
          Tout ce que tu veux savoir,<br />
          <span className="text-gradient-cyan">avant de te lancer.</span>
        </h2>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className={cn(
                "glass rounded-2xl overflow-hidden transition-all",
                isOpen && "ring-cyan"
              )}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 md:p-6 text-left hover:bg-surface-elevated/40 transition-colors"
              >
                <span className="font-display font-semibold text-base md:text-lg">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-primary shrink-0 transition-transform duration-300",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 md:px-6 pb-5 md:pb-6 text-muted-foreground leading-relaxed text-[15px]">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
