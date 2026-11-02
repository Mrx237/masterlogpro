// Génère chaque jour 3 exercices (technique, fondamental, psychologie) via Lovable AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATS = {
  technique: "analyse technique (structure de marché, supports/résistances, chandeliers, tendances, gestion d'entrée/stop/TP, ratio risque/rendement)",
  fondamental: "analyse fondamentale (news économiques NFP, CPI, taux des banques centrales, impact sur les devises et l'or)",
  psychologie: "psychologie du trading (discipline, gestion des émotions, FOMO, revenge trading, journal, routine)",
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await admin.from("exercises").select("category").eq("daily_date", today);
    const done = new Set((existing ?? []).map((e: any) => e.category));
    const todo = (Object.keys(CATS) as (keyof typeof CATS)[]).filter((c) => !done.has(c));
    if (!todo.length) return json({ ok: true, created: 0 });

    const { data: adm } = await admin.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
    if (!adm) throw new Error("Aucun admin pour créer les exercices");

    const levels = ["debutant", "intermediaire", "avance"] as const;
    const level = levels[new Date().getUTCDate() % 3];
    let created = 0;

    for (const cat of todo) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Tu es un coach de trading Forex francophone. Tu crées des exercices pratiques, concrets et courts." },
            { role: "user", content: `Crée un exercice du jour (${today}) de niveau ${level} sur le thème : ${CATS[cat]}. Varie les sujets. Donne un titre court et une consigne claire (5-10 lignes) avec un scénario concret et des questions précises auxquelles le trader doit répondre par écrit.` },
          ],
          tools: [{ type: "function", function: { name: "exercise", parameters: { type: "object", properties: { title: { type: "string" }, instructions: { type: "string" } }, required: ["title", "instructions"] } } }],
          tool_choice: { type: "function", function: { name: "exercise" } },
        }),
      });
      if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
      const d = await r.json();
      const args = JSON.parse(d.choices[0].message.tool_calls[0].function.arguments);
      const { error } = await admin.from("exercises").insert({
        title: args.title, instructions: args.instructions, level, category: cat,
        daily_date: today, is_published: true, created_by: adm.user_id,
      });
      if (!error) created++;
    }
    return json({ ok: true, created });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
