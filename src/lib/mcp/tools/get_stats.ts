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
  name: "get_stats",
  title: "Get my trading stats",
  description: "Return the signed-in user's aggregated trading stats: total trades, win rate, net P&L, best streak.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data: trades, error } = await sb.from("trades").select("status, result_usd").eq("user_id", ctx.getUserId());
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const total = trades?.length ?? 0;
    const wins = trades?.filter((t: any) => t.status === "win").length ?? 0;
    const losses = trades?.filter((t: any) => t.status === "loss").length ?? 0;
    const scored = wins + losses;
    const netPnl = (trades ?? []).reduce((s: number, t: any) => s + (Number(t.result_usd) || 0), 0);
    const winRate = scored > 0 ? (wins / scored) * 100 : 0;
    const stats = {
      total_trades: total,
      wins,
      losses,
      win_rate_pct: Number(winRate.toFixed(2)),
      net_pnl_usd: Number(netPnl.toFixed(2)),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      structuredContent: stats,
    };
  },
});
