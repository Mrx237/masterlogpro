import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, BookOpen, Pencil, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Exercise { id: string; title: string; instructions: string; level: "debutant" | "intermediaire" | "avance"; is_published: boolean; created_at: string }
interface Submission { id: string; exercise_id: string; user_id: string; answer: string | null; status: string; grade: number | null; coach_feedback: string | null; submitted_at: string | null; profiles?: { full_name: string | null; email: string | null } | null }

export function ExercisesAdminTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  const [reviewing, setReviewing] = useState<Exercise | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("exercises").select("*").order("created_at", { ascending: false });
    if (data) setItems(data as Exercise[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function togglePublish(ex: Exercise) {
    const { error } = await supabase.from("exercises").update({ is_published: !ex.is_published }).eq("id", ex.id);
    if (error) return toast.error(error.message);
    toast.success(ex.is_published ? "Dépublié" : "Publié");
    load();
  }

  return (
    <Card className="glass overflow-hidden">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div>
          <div className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-student" />{items.length} exercice{items.length > 1 ? "s" : ""}</div>
          <div className="text-xs text-muted-foreground">Visibles par les élèves quand publiés.</div>
        </div>
        <Button onClick={() => setCreating(true)} className="bg-gradient-gold text-student-foreground border-0 font-semibold">
          <Plus className="h-4 w-4" /> Créer un exercice
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Aucun exercice. Crée le premier !</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-3">Titre</th><th className="px-3 py-3">Niveau</th><th className="px-3 py-3">Publié</th><th className="px-3 py-3">Créé</th><th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((ex) => (
                <tr key={ex.id} className="border-t border-border/50 hover:bg-secondary/30">
                  <td className="px-3 py-3 font-medium">{ex.title}</td>
                  <td className="px-3 py-3 text-xs"><Badge variant="outline">{ex.level}</Badge></td>
                  <td className="px-3 py-3">
                    <button onClick={() => togglePublish(ex)} className="inline-flex items-center gap-1 text-xs">
                      {ex.is_published ? <><Eye className="h-3 w-3 text-gain" /><span className="text-gain">Publié</span></> : <><EyeOff className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Brouillon</span></>}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{new Date(ex.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setReviewing(ex)}>Soumissions</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(ex)}><Pencil className="h-3 w-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ExerciseForm
        open={creating || !!editing}
        ex={editing}
        userId={user?.id ?? ""}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={load}
      />
      <SubmissionsDialog ex={reviewing} onClose={() => setReviewing(null)} />
    </Card>
  );
}

function ExerciseForm({ open, ex, userId, onClose, onSaved }: { open: boolean; ex: Exercise | null; userId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [level, setLevel] = useState<"debutant" | "intermediaire" | "avance">("debutant");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ex) { setTitle(ex.title); setInstructions(ex.instructions); setLevel(ex.level); }
    else { setTitle(""); setInstructions(""); setLevel("debutant"); }
  }, [ex, open]);

  async function save() {
    if (!title.trim() || !instructions.trim()) return toast.error("Titre et consigne obligatoires.");
    setBusy(true);
    const payload = { title, instructions, level };
    const { error } = ex
      ? await supabase.from("exercises").update(payload).eq("id", ex.id)
      : await supabase.from("exercises").insert({ ...payload, created_by: userId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(ex ? "Exercice mis à jour" : "Exercice créé");
    onClose();
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{ex ? "Modifier" : "Créer un exercice"}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div><Label>Titre</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Analyse EUR/USD du 12 mars" /></div>
          <div>
            <Label>Niveau</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="debutant">Débutant</SelectItem>
                <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                <SelectItem value="avance">Avancé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Consigne</Label><Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6} placeholder="Décris l'exercice attendu..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={busy} className="bg-gradient-gold text-student-foreground border-0">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionsDialog({ ex, onClose }: { ex: Exercise | null; onClose: () => void }) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [active, setActive] = useState<Submission | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!ex) return;
    const { data } = await supabase.from("exercise_submissions").select("*").eq("exercise_id", ex.id).order("submitted_at", { ascending: false });
    if (data) {
      const ids = [...new Set(data.map((s: any) => s.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setSubs(data.map((s: any) => ({ ...s, profiles: map.get(s.user_id) ?? null })));
    }
  }
  useEffect(() => { if (ex) load(); }, [ex]);

  function open(s: Submission) {
    setActive(s);
    setGrade(s.grade?.toString() ?? "");
    setFeedback(s.coach_feedback ?? "");
  }

  async function grade_submit() {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase.from("exercise_submissions").update({
      grade: grade ? Number(grade) : null,
      coach_feedback: feedback || null,
      status: "graded" as const,
      graded_at: new Date().toISOString(),
    }).eq("id", active.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Correction envoyée à l'élève");
    setActive(null);
    load();
  }

  return (
    <Dialog open={!!ex} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Soumissions — {ex?.title}</DialogTitle></DialogHeader>
        {!active ? (
          subs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Aucune soumission encore.</div>
          ) : (
            <div className="space-y-2">
              {subs.map((s) => (
                <button key={s.id} onClick={() => open(s)} className="w-full text-left rounded-lg border border-border/50 p-3 hover:bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{s.profiles?.full_name || s.profiles?.email}</div>
                      <div className="text-xs text-muted-foreground">{s.submitted_at ? new Date(s.submitted_at).toLocaleString("fr-FR") : "—"}</div>
                    </div>
                    {s.status === "graded" ? <Badge className="bg-gain/15 text-gain border border-gain/30">Corrigé · {s.grade}/20</Badge> : <Badge variant="secondary">À corriger</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3 text-sm">
            <div className="text-xs text-muted-foreground">Élève : {active.profiles?.full_name || active.profiles?.email}</div>
            <div className="rounded-lg bg-secondary/40 p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Réponse</div><p className="whitespace-pre-wrap">{active.answer || "—"}</p></div>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="col-span-1"><Label>Note /20</Label><Input type="number" min="0" max="20" step="0.5" value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
              <div className="col-span-2"><Label>Feedback coach</Label><Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActive(null)}>Retour</Button>
              <Button onClick={grade_submit} disabled={busy} className="bg-gradient-gold text-student-foreground border-0">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer la correction
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════ ANALYSES ADMIN ═══════════════════ */
interface Analysis { id: string; title: string; market_state: string | null; key_news: string | null; expected_direction: string | null; week_start: string; is_published: boolean; created_at: string }

export function AnalysesAdminTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<Analysis>>({ title: "", market_state: "", key_news: "", expected_direction: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("weekly_analyses").select("*").order("week_start", { ascending: false });
    if (data) setItems(data as Analysis[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function publish() {
    if (!draft.title?.trim()) return toast.error("Donne un titre.");
    setBusy(true);
    const { error } = await supabase.from("weekly_analyses").insert({
      title: draft.title!,
      market_state: draft.market_state || null,
      key_news: draft.key_news || null,
      expected_direction: draft.expected_direction || null,
      created_by: user?.id ?? "",
      is_published: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Analyse publiée 🎉");
    setDraft({ title: "", market_state: "", key_news: "", expected_direction: "" });
    load();
  }

  async function togglePublish(a: Analysis) {
    await supabase.from("weekly_analyses").update({ is_published: !a.is_published }).eq("id", a.id);
    load();
  }
  async function remove(a: Analysis) {
    if (!confirm("Supprimer cette analyse ?")) return;
    await supabase.from("weekly_analyses").delete().eq("id", a.id);
    load();
  }

  return (
    <div className="space-y-6">
      <Card className="glass p-5 md:p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-student mb-2">Nouvelle publication</div>
        <h3 className="font-display text-lg font-bold mb-4">Écrire l'analyse hebdomadaire</h3>
        <div className="space-y-3">
          <div><Label>Titre</Label><Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex : Semaine du 15 avril — FED + NFP" /></div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>État du marché</Label><Textarea value={draft.market_state ?? ""} onChange={(e) => setDraft({ ...draft, market_state: e.target.value })} rows={4} placeholder="Risk-off, USD fort..." /></div>
            <div><Label>News importantes</Label><Textarea value={draft.key_news ?? ""} onChange={(e) => setDraft({ ...draft, key_news: e.target.value })} rows={4} placeholder="FED mercredi, NFP vendredi..." /></div>
            <div><Label>Direction possible</Label><Textarea value={draft.expected_direction ?? ""} onChange={(e) => setDraft({ ...draft, expected_direction: e.target.value })} rows={4} placeholder="EUR/USD baissier, XAU bullish..." /></div>
          </div>
          <Button onClick={publish} disabled={busy} className="bg-gradient-gold text-student-foreground border-0 font-semibold">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}👉 Publier
          </Button>
        </div>
      </Card>

      <Card className="glass overflow-hidden">
        <div className="p-4 border-b border-border/50 font-semibold">Publications ({items.length})</div>
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Aucune analyse publiée.</div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((a) => (
              <div key={a.id} className="p-4 flex items-start justify-between gap-3 hover:bg-secondary/30">
                <div className="min-w-0">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Semaine du {new Date(a.week_start).toLocaleDateString("fr-FR")} · {a.is_published ? <span className="text-gain">Publiée</span> : <span>Brouillon</span>}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => togglePublish(a)}>{a.is_published ? "Dépublier" : "Publier"}</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(a)}>Supprimer</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
