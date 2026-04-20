import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PAIRS } from "@/lib/constants";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

const schema = z.object({
  pair: z.string().min(1),
  direction: z.enum(["buy", "sell"]),
  trade_at: z.string().min(1),
  technical_comment: z.string().max(2000).optional(),
  news_event: z.string().max(500).optional(),
  fundamental_note: z.string().max(2000).optional(),
  source_link: z.string().max(500).optional(),
});

const NewTrade = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [pair, setPair] = useState<string>("EUR/USD");
  const [status, setStatus] = useState<string>("");
  const [impact, setImpact] = useState<string>("none");
  const [sentiment, setSentiment] = useState<string>("neutral");
  const [errorTag, setErrorTag] = useState<string>("none");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const num = (k: string) => {
      const v = fd.get(k); if (!v) return null;
      const n = parseFloat(String(v)); return Number.isFinite(n) ? n : null;
    };

    const parsed = schema.safeParse({
      pair, direction,
      trade_at: fd.get("trade_at"),
      technical_comment: fd.get("technical_comment") || undefined,
      news_event: fd.get("news_event") || undefined,
      fundamental_note: fd.get("fundamental_note") || undefined,
      source_link: fd.get("source_link") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    setSubmitting(true);
    let screenshot_path: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("trade-screenshots").upload(path, file);
      if (upErr) { toast.error("Upload échoué : " + upErr.message); setSubmitting(false); return; }
      screenshot_path = path;
    }

    const { error } = await supabase.from("trades").insert({
      user_id: user.id,
      trade_at: new Date(parsed.data.trade_at).toISOString(),
      pair, direction,
      entry_price: num("entry_price"),
      exit_price: num("exit_price"),
      stop_loss: num("stop_loss"),
      take_profit: num("take_profit"),
      lot_size: num("lot_size"),
      result_usd: num("result_usd"),
      status: (status || null) as any,
      news_event: parsed.data.news_event,
      news_impact: impact as any,
      sentiment: sentiment as any,
      fundamental_note: parsed.data.fundamental_note,
      source_link: parsed.data.source_link,
      error_tag: errorTag as any,
      technical_comment: parsed.data.technical_comment,
      screenshot_path,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Trade enregistré !");
    navigate("/dashboard");
  }

  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 max-w-3xl">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour au dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Nouveau trade</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TECHNIQUE */}
          <Card className="p-5 shadow-card">
            <h2 className="font-semibold mb-4">📊 Partie technique</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Date et heure"><Input type="datetime-local" name="trade_at" defaultValue={nowLocal} required /></Field>
              <Field label="Paire">
                <Select value={pair} onValueChange={setPair}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAIRS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Direction">
                <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy 📈</SelectItem>
                    <SelectItem value="sell">Sell 📉</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Taille de lot"><Input type="number" step="0.01" name="lot_size" placeholder="0.10" /></Field>
              <Field label="Prix d'entrée"><Input type="number" step="0.00001" name="entry_price" /></Field>
              <Field label="Prix de sortie"><Input type="number" step="0.00001" name="exit_price" /></Field>
              <Field label="Stop Loss"><Input type="number" step="0.00001" name="stop_loss" /></Field>
              <Field label="Take Profit"><Input type="number" step="0.00001" name="take_profit" /></Field>
              <Field label="Résultat ($)"><Input type="number" step="0.01" name="result_usd" placeholder="ex: 25.50 ou -10" /></Field>
              <Field label="Statut">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="win">Gagnant</SelectItem>
                    <SelectItem value="loss">Perdant</SelectItem>
                    <SelectItem value="breakeven">Break-even</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Screenshot" className="mt-4">
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <Field label="Commentaire technique" className="mt-4">
              <Textarea name="technical_comment" rows={3} maxLength={2000} placeholder="Setup, raison de l'entrée..." />
            </Field>
          </Card>

          {/* FONDAMENTAL */}
          <Card className="p-5 shadow-card">
            <h2 className="font-semibold mb-4">📰 Partie fondamentale</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Actualité / événement" className="sm:col-span-2"><Input name="news_event" maxLength={500} placeholder="ex: NFP, décision FED..." /></Field>
              <Field label="Impact">
                <Select value={impact} onValueChange={setImpact}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="high">Fort</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Sentiment">
                <Select value={sentiment} onValueChange={setSentiment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bullish">Haussier</SelectItem>
                    <SelectItem value="neutral">Neutre</SelectItem>
                    <SelectItem value="bearish">Baissier</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Note fondamentale" className="mt-4">
              <Textarea name="fundamental_note" rows={2} maxLength={2000} />
            </Field>
            <Field label="Lien source" className="mt-4">
              <Input name="source_link" type="url" maxLength={500} placeholder="https://..." />
            </Field>
          </Card>

          {/* ANALYSE */}
          <Card className="p-5 shadow-card">
            <h2 className="font-semibold mb-4">🧠 Analyse</h2>
            <Field label="Tag d'erreur (s'il y en a une)">
              <Select value={errorTag} onValueChange={setErrorTag}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  <SelectItem value="bad_timing">Mauvais timing</SelectItem>
                  <SelectItem value="overtrading">Overtrading</SelectItem>
                  <SelectItem value="bad_analysis">Mauvaise analyse</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}Enregistrer le trade
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default NewTrade;
