import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type Caller = { userId: string; isAdmin: boolean; hasAccess: boolean };

/** Resolves the signed-in caller and their access level; returns null if not signed in. */
export async function getCaller(req: Request, admin: SupabaseClient): Promise<Caller | null> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;
  const uid = data.user.id;
  const [{ data: isAdmin }, { data: hasAccess }] = await Promise.all([
    admin.rpc("is_admin", { _user_id: uid }),
    admin.rpc("has_journal_access", { _uid: uid }),
  ]);
  return { userId: uid, isAdmin: !!isAdmin, hasAccess: !!hasAccess || !!isAdmin };
}

/** True when the request carries the internal scheduled-job token. */
export async function hasJobToken(req: Request, admin: SupabaseClient, name: string): Promise<boolean> {
  const t = req.headers.get("x-job-token");
  if (!t) return false;
  const { data } = await admin.from("internal_job_tokens").select("token").eq("name", name).maybeSingle();
  return !!data?.token && data.token === t;
}
