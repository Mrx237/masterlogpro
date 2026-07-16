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
  name: "create_trade",
  title: "Log a trade",
  description: "Insert a new trade in the signed-in user's MasterLogPro journal.",
  inputSchema: {
    pair: z.string().min(1).describe("Trading pair, e.g. 'EUR/USD', 'XAU/USD', 'BTC/USD'."),
    direction: z.enum(["long", "short"]).describe("Trade direction."),
    entry_price: z.number().nullable().describe("Entry price."),
    exit_price: z.number().nullable().describe("Exit price if closed."),
    stop_loss: z.number().nullable().describe("Stop loss price."),
    take_profit: z.number().nullable().describe("Take profit price."),
    lot_size: z.number().nullable().describe("Position size (lots)."),
    result_usd: z.number().nullable().describe("Realized P&L in USD."),
    status: z.enum(["win", "loss", "break_even", "open"]).nullable().describe("Trade outcome."),
    technical_comment: z.string().nullable().describe("Optional technical analysis note."),
    trade_at: z.string().nullable().describe("ISO datetime; defaults to now."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const row: Record<string, unknown> = {
      user_id: ctx.getUserId(),
      pair: input.pair,
      direction: input.direction,
      trade_at: input.trade_at ?? new Date().toISOString(),
    };
    for (const k of ["entry_price","exit_price","stop_loss","take_profit","lot_size","result_usd","status","technical_comment"] as const) {
      if (input[k] !== null && input[k] !== undefined) row[k] = input[k];
    }
    const { data, error } = await supabaseForUser(ctx).from("trades").insert(row).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Trade créé: ${data.id}` }],
      structuredContent: { trade: data },
    };
  },
});
