import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTrades from "./tools/list_trades";
import createTrade from "./tools/create_trade";
import getStats from "./tools/get_stats";
import listEconomicNews from "./tools/list_economic_news";

// Build the direct Supabase issuer from the project ref. Vite inlines
// VITE_SUPABASE_PROJECT_ID as a literal at build time (import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "masterlogpro-mcp",
  title: "MasterLogPro",
  version: "0.1.0",
  instructions:
    "Outils MasterLogPro pour ton journal de trading. Utilise `list_trades` pour consulter tes trades, `create_trade` pour en enregistrer un nouveau, `get_stats` pour tes statistiques agrégées, et `list_economic_news` pour les news économiques suivies par la plateforme.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTrades, createTrade, getStats, listEconomicNews],
});
