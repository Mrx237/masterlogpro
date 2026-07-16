import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_economic_news",
  title: "List economic news",
  description: "List upcoming and recent economic news events tracked by MasterLogPro.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(15).describe("Number of news items to return."),
    impact: z.enum(["low", "medium", "high"]).nullable().describe("Optional filter by impact."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, impact }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx).from("economic_news").select(
      "id, title, currency, country, event_at, impact, sentiment, actual, forecast, previous, summary"
    ).order("event_at", { ascending: false }).limit(limit);
    if (impact) q = q.eq("impact", impact);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { news: data ?? [] },
    };
  },
});
