import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

// Supabase's OAuth helpers are in a beta namespace that TS may not know about.
type OAuthClient = { name?: string; client_name?: string; redirect_uris?: string[] };
type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Requête d'autorisation invalide (authorization_id manquant).");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setAccount(sess.session.user.email ?? sess.session.user.id);
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message ?? "Impossible de charger cette autorisation.");
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        if (active) setError(e?.message ?? String(e));
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) { setBusy(false); return setError(error.message ?? "Échec de la décision."); }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setBusy(false); return setError("Aucune URL de redirection renvoyée par le serveur d'autorisation."); }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? String(e));
    }
  }

  const clientName = details?.client?.client_name ?? details?.client?.name ?? "cette application";
  const scopes = details?.scopes ?? (details?.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <div className="min-h-screen grid place-items-center p-6 noise">
      <div className="glass-strong rounded-2xl p-7 max-w-md w-full shadow-elevated">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-4">
          <ShieldCheck className="h-3.5 w-3.5" /> Autorisation
        </div>

        {error && (
          <div className="text-sm text-destructive mb-4">{error}</div>
        )}

        {!details && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        )}

        {details && (
          <>
            <h1 className="font-display text-2xl font-bold mb-2">
              Connecter <span className="text-gradient-cyan">{clientName}</span>
            </h1>
            <p className="text-sm text-muted-foreground mb-5">
              {clientName} pourra utiliser les outils de MasterLogPro en ton nom tant que tu es connecté.
              Cela ne contourne pas les règles d'accès ni les politiques de la plateforme.
            </p>

            {account && (
              <div className="text-xs text-muted-foreground mb-4">
                Compte connecté : <span className="text-foreground font-medium">{account}</span>
              </div>
            )}

            {scopes.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Permissions demandées</div>
                <ul className="text-sm space-y-1">
                  {scopes.map((s) => (
                    <li key={s} className="text-foreground/90">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => decide(true)}
                disabled={busy}
                className="flex-1 bg-gradient-brand text-primary-foreground border-0 font-semibold glow-cyan"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Autoriser
              </Button>
              <Button
                onClick={() => decide(false)}
                disabled={busy}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
