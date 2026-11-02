// Corrige automatiquement une réponse d'exercice via Lovable AI (note /20 + feedback).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Non connecté" }, 401);

    const body = await req.json().catch(() => ({}));
    const exerciseId = typeof body.exercise_id === "string" ? body.exercise_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(exerciseId)) return json({ error: "exercise_id invalide" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: sub } = await admin.from("exercise_submissions").select("id, answer, status")
      .eq("exercise_id", exerciseId).eq("user_id", user.id).maybeSingle();
    if (!sub?.answer) return json({ error: "Aucune réponse à corriger" }, 400);
    if (sub.status === "graded") return json({ ok: true, already: true });
    const { data: ex } = await admin.from("exercises").select("title, instructions, level, category").eq("id", exerciseId).single();
    if (!ex) return json({ error: "Exercice introuvable" }, 404);

    const r = await grade(ex, sub.answer.slice(0, 8000));
    if ("status" in r) return json({ error: r.error }, r.status);
    const grade_ = Math.max(0, Math.min(20, Math.round(r.grade * 2) / 2));
    await admin.from("exercise_submissions").update({
      grade: grade_, coach_feedback: r.feedback, status: "graded", graded_at: new Date().toISOString(),
    }).eq("id", sub.id);
    return json({ ok: true, grade: grade_ });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function grade(ex: any, answer: string): Promise<{ grade: number; feedback: string } | { status: number; error: string }> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra", stream: true, store: false, reasoning: { effort: "low" },
      instructions: "Tu es un coach de trading Forex francophone, exigeant mais bienveillant. Tu corriges les réponses d'exercices de façon honnête et concrète. Note sur 20. Le feedback (8-15 lignes, tutoiement) contient : ✅ Points forts, ⚠️ À améliorer (gestion du risque, confirmations, émotions...), 💡 Corrigé type résumé, 🎯 Conseil clé.",
      input: `Exercice (${ex.level}, ${ex.category ?? "général"}) : ${ex.title}\n\nConsigne :\n${ex.instructions}\n\nRéponse du trader :\n${answer}`,
      text: { format: { type: "json_schema", name: "grading", strict: true, schema: {
        type: "object", additionalProperties: false, required: ["grade", "feedback"],
        properties: { grade: { type: "number" }, feedback: { type: "string" } },
      } } },
    }),
  });
  if (!r.ok || !r.body) {
    const t = await r.text();
    const msg = r.status === 402 ? "Crédits IA épuisés, correction impossible pour le moment." : r.status === 429 ? "Trop de demandes, réessaie dans un instant." : `IA ${r.status}: ${t.slice(0, 200)}`;
    return { status: r.status === 402 || r.status === 429 || r.status === 403 ? r.status : 502, error: msg };
  }
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "", out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      const d = l.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try { const ev = JSON.parse(d); if (ev.type === "response.output_text.delta") out += ev.delta; } catch { /* ignore */ }
    }
  }
  if (!out) return { status: 502, error: "L'IA n'a pas renvoyé de correction." };
  return JSON.parse(out);
}
