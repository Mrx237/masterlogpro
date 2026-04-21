import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MotivationBanner } from "@/components/MotivationBanner";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Loader2, CheckCircle2, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string; title: string; instructions: string; level: "debutant" | "intermediaire" | "avance"; created_at: string;
}
interface Submission {
  id: string; exercise_id: string; status: "pending" | "submitted" | "graded";
  answer: string | null; grade: number | null; coach_feedback: string | null; submitted_at: string | null;
}

const Exercises = () => {
  const { user, isStudent, isAdmin } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [subs, setSubs] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Exercise | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: ex }, { data: ms }] = await Promise.all([
      supabase.from("exercises").select("*").eq("is_published", true).order("created_at", { ascending: false }),
      supabase.from("exercise_submissions").select("*").eq("user_id", user.id),
    ]);
    if (ex) setExercises(ex as Exercise[]);
    if (ms) {
      const map: Record<string, Submission> = {};
      (ms as Submission[]).forEach((s) => { map[s.exercise_id] = s; });
      setSubs(map);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  function open(ex: Exercise) {
    setActive(ex);
    setAnswer(subs[ex.id]?.answer ?? "");
  }

  async function submit() {
    if (!active || !user) return;
    if (!answer.trim()) return toast.error("Écris ta réponse avant de soumettre.");
    setBusy(true);
    const { error } = await supabase.from("exercise_submissions").upsert({
      exercise_id: active.id,
      user_id: user.id,
      answer,
      status: "submitted" as const,
      submitted_at: new Date().toISOString(),
    }, { onConflict: "exercise_id,user_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Réponse envoyée — le coach va la corriger.");
    setActive(null);
    load();
  }

  if (!isStudent && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-12">
          <Card className="glass p-10 text-center max-w-md mx-auto">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-display text-xl font-bold mb-2">Réservé aux élèves</h2>
            <p className="text-sm text-muted-foreground mb-5">Les exercices font partie de la formation. Rejoins-la pour y accéder.</p>
            <Button asChild className="bg-gradient-gold text-student-foreground border-0"><Link to="/subscribe?offer=formation">Rejoindre la formation</Link></Button>
          </Card>
        </main>
      </div>
    );
  }

  const counts = {
    todo: exercises.filter((e) => !subs[e.id] || subs[e.id].status === "pending").length,
    submitted: exercises.filter((e) => subs[e.id]?.status === "submitted").length,
    graded: exercises.filter((e) => subs[e.id]?.status === "graded").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-10 space-y-6">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Exercices</h1>
          <p className="text-sm text-muted-foreground mt-1">Pratique. Soumets. Reçois la correction du coach.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <CountTile label="🟡 À faire" v={counts.todo} color="text-student" />
          <CountTile label="🔵 Rendu" v={counts.submitted} color="text-primary" />
          <CountTile label="🟢 Corrigé" v={counts.graded} color="text-gain" />
        </div>

        {loading ? (
          <Card className="glass p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></Card>
        ) : exercises.length === 0 ? (
          <Card className="glass p-12 text-center text-sm text-muted-foreground">Aucun exercice publié pour le moment.</Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {exercises.map((ex) => {
              const s = subs[ex.id];
              const status = s?.status ?? "pending";
              return (
                <button key={ex.id} onClick={() => open(ex)} className="glass rounded-xl p-5 text-left hover:-translate-y-0.5 transition-all hover:ring-gold">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{ex.level}</Badge>
                    <SubBadge status={status} />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-1">{ex.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{ex.instructions}</p>
                  {s?.grade != null && (
                    <div className="mt-3 text-xs font-mono text-gain">Note : {s.grade}/20</div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <MotivationBanner tone="gold" />

        <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{active?.title}</DialogTitle>
            </DialogHeader>
            {active && (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg bg-secondary/40 p-4">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-mono mb-2">Consigne</div>
                  <p className="whitespace-pre-wrap text-foreground/90">{active.instructions}</p>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-student font-mono mb-2">Ta réponse</div>
                  <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} placeholder="Rédige ton analyse, ton plan de trade, ta réponse..." disabled={subs[active.id]?.status === "graded"} />
                </div>

                {subs[active.id]?.grade != null && (
                  <div className="rounded-lg bg-gain/10 border border-gain/30 p-4">
                    <div className="text-[11px] uppercase tracking-wider text-gain font-mono mb-1">Note</div>
                    <div className="font-mono text-2xl font-bold">{subs[active.id].grade}/20</div>
                  </div>
                )}
                {subs[active.id]?.coach_feedback && (
                  <div className="rounded-lg bg-student/10 border border-student/30 p-4">
                    <div className="text-[11px] uppercase tracking-wider text-student font-mono mb-2">💬 Feedback coach</div>
                    <p className="whitespace-pre-wrap text-foreground/90">{subs[active.id].coach_feedback}</p>
                  </div>
                )}

                {subs[active.id]?.status !== "graded" && (
                  <Button onClick={submit} disabled={busy} className="w-full bg-gradient-gold text-student-foreground border-0 font-semibold h-11">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {subs[active.id]?.status === "submitted" ? "Mettre à jour ma réponse" : "Soumettre"}
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

function CountTile({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <Card className="glass p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={cn("font-display text-2xl md:text-3xl font-bold mt-1", color)}>{v}</div>
    </Card>
  );
}

function SubBadge({ status }: { status: "pending" | "submitted" | "graded" }) {
  if (status === "graded") return <Badge className="bg-gain/15 text-gain border border-gain/30 gap-1"><CheckCircle2 className="h-3 w-3" />Corrigé</Badge>;
  if (status === "submitted") return <Badge className="bg-primary/15 text-primary border border-primary/30 gap-1"><Clock className="h-3 w-3" />Rendu</Badge>;
  return <Badge variant="outline" className="border-student/40 text-student gap-1">À faire</Badge>;
}

export default Exercises;
