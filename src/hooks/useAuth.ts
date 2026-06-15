import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "student" | "subscriber";

export interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  status: "pending" | "active" | "expired";
  subscription_ends_at: string | null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        // defer to avoid deadlock
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(uid: string) {
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      setProfile(p as ProfileRow | null);
      setRoles((r ?? []).map((x: any) => x.role as AppRole));
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = roles.includes("admin");
  const isStudent = roles.includes("student");
  const isSubscriber = roles.includes("subscriber");
  const hasJournalAccess =
    isAdmin || isStudent || isSubscriber || profile?.status === "active";

  return { session, user, profile, roles, isAdmin, isStudent, isSubscriber, hasJournalAccess, loading };
}
