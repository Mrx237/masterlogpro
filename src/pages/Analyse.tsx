import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MotivationBanner } from "@/components/MotivationBanner";
import { ArrowLeft, MessageSquare, Loader2, Newspaper, Target, Calendar } from "lucide-react";

interface Analysis {
  id: string; title: string; market_state: string | null; key_news: string | null; expected_direction: string | null;
  week_start: string; created_at: string;
}

const Analyse = () => {
  const { isStudent, isAdmin } = useAuth();
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("weekly_analyses").select("*").eq("is_published", true).order("week_start", { ascending: false });
      if (data) setItems(data as Analysis[]);
      setLoading(false);
    })();
  }, []);

  if (!isStudent && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-12">
          <Card className="glass p-10 text-center max-w-md mx-auto">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-display text-xl font-bold mb-2">Réservé aux élèves</h2>
            <p className="text-sm text-muted-foreground mb-5">L'analyse hebdomadaire est offerte avec la formation.</p>
            <Button asChild className="bg-gradient-gold text-student-foreground border-0"><Link to="/subscribe?offer=formation">Rejoindre la formation</Link></Button>
          </Card>
        </main>
      </div>
    );
  }

  const latest = items[0];
  const previous = items.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-10 space-y-6">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
          <h1 className="font-display text-3xl md:text-4xl font-bold">📊 Analyse hebdomadaire</h1>
          <p className="text-sm text-muted-foreground mt-1">Lecture du marché et direction probable de la semaine.</p>
        </div>

        {loading ? (
          <Card className="glass p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></Card>
        ) : !latest ? (
          <Card className="glass p-12 text-center text-sm text-muted-foreground">Aucune analyse publiée pour le moment.</Card>
        ) : (
          <>
            <Card className="glass-strong p-6 md:p-8 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-student/15 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-mono text-student mb-3">
                  <Calendar className="h-3 w-3" />
                  Semaine du {new Date(latest.week_start).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">{latest.title}</h2>

                <div className="grid md:grid-cols-3 gap-4">
                  <Block icon={Target} title="État du marché" content={latest.market_state} />
                  <Block icon={Newspaper} title="News importantes" content={latest.key_news} />
                  <Block icon={MessageSquare} title="Direction possible" content={latest.expected_direction} highlight />
                </div>
              </div>
            </Card>

            {previous.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-3">Archives</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {previous.map((a) => (
                    <Card key={a.id} className="glass p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                        Semaine du {new Date(a.week_start).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </div>
                      <h3 className="font-display font-bold mt-1">{a.title}</h3>
                      {a.expected_direction && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{a.expected_direction}</p>}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <MotivationBanner tone="gold" />
      </main>
    </div>
  );
};

function Block({ icon: Icon, title, content, highlight }: { icon: any; title: string; content: string | null; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-student/10 border border-student/30" : "bg-secondary/40"}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-mono text-muted-foreground mb-2">
        <Icon className={`h-3.5 w-3.5 ${highlight ? "text-student" : ""}`} />
        {title}
      </div>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{content || "—"}</p>
    </div>
  );
}

export default Analyse;
