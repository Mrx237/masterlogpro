import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { OFFERS, OfferKey, formatFCFA } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, ExternalLink, Shield, ShieldOff, UserCheck, UserX, TrendingUp, TrendingDown, UserPlus, Copy } from "lucide-react";

type AppRole = "admin" | "student" | "subscriber";
type AccountStatus = "pending" | "active" | "expired";

interface PaymentRow {
  id: string; user_id: string; offer: OfferKey; amount_fcfa: number; method: string;
  payer_phone: string | null; proof_path: string | null; status: string; note: string | null;
  created_at: string; admin_note: string | null;
  profiles?: { email: string | null; full_name: string | null } | null;
}

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  status: AccountStatus;
  subscription_ends_at: string | null;
  created_at: string;
  initial_capital: number | null;
  roles: AppRole[];
  trades_count: number;
  total_pnl: number;
  win_rate: number;
}

import { ExercisesAdminTab, AnalysesAdminTab, NewsAdminTab } from "@/components/admin/AdminTabs";
import { AffiliatesAdminTab } from "@/components/admin/AffiliatesAdminTab";

const Admin = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AppHeader />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
      <main className="container relative py-4 md:py-8 max-w-7xl">
        <Tabs defaultValue="users" className="space-y-4">
          {/* Sticky top bar — titre + tabs alignés en haut, pas de débordement */}
          <div className="sticky top-[64px] z-20 -mx-4 px-4 md:-mx-6 md:px-6 py-3 backdrop-blur-xl bg-background/85 border-b border-border/50">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-accent font-mono mb-1.5">
              <Shield className="h-3 w-3" /> Console Admin
            </div>
            <h1 className="font-display text-xl md:text-2xl font-bold leading-tight">Cockpit administrateur</h1>
            <div className="mt-3 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-none">
              <TabsList className="glass inline-flex w-auto min-w-max">
                <TabsTrigger value="users" className="text-xs md:text-sm whitespace-nowrap">👥 Utilisateurs</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs md:text-sm whitespace-nowrap">💳 Paiements</TabsTrigger>
                <TabsTrigger value="affiliates" className="text-xs md:text-sm whitespace-nowrap">🎁 Affiliés</TabsTrigger>
                <TabsTrigger value="exercises" className="text-xs md:text-sm whitespace-nowrap">📚 Exercices</TabsTrigger>
                <TabsTrigger value="analyses" className="text-xs md:text-sm whitespace-nowrap">📊 Analyses</TabsTrigger>
                <TabsTrigger value="news" className="text-xs md:text-sm whitespace-nowrap">📰 News</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
          <TabsContent value="payments" className="mt-4"><PaymentsTab /></TabsContent>
          <TabsContent value="affiliates" className="mt-4"><AffiliatesAdminTab /></TabsContent>
          <TabsContent value="exercises" className="mt-4"><ExercisesAdminTab /></TabsContent>
          <TabsContent value="analyses" className="mt-4"><AnalysesAdminTab /></TabsContent>
          <TabsContent value="news" className="mt-4"><NewsAdminTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

/* ================== USERS TAB ================== */

function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<UserRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: profs }, { data: roles }, { data: trades }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("trades").select("user_id, result_usd, status"),
    ]);

    const rolesMap = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesMap.set(r.user_id, arr);
    });

    const tradesMap = new Map<string, { count: number; pnl: number; wins: number; closed: number }>();
    (trades ?? []).forEach((t: any) => {
      const cur = tradesMap.get(t.user_id) ?? { count: 0, pnl: 0, wins: 0, closed: 0 };
      cur.count += 1;
      if (t.result_usd != null) cur.pnl += Number(t.result_usd);
      if (t.status === "win" || t.status === "loss") {
        cur.closed += 1;
        if (t.status === "win") cur.wins += 1;
      }
      tradesMap.set(t.user_id, cur);
    });

    setUsers(
      (profs ?? []).map((p: any): UserRow => {
        const t = tradesMap.get(p.id) ?? { count: 0, pnl: 0, wins: 0, closed: 0 };
        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          status: p.status,
          subscription_ends_at: p.subscription_ends_at,
          created_at: p.created_at,
          initial_capital: p.initial_capital ?? null,
          roles: rolesMap.get(p.id) ?? [],
          trades_count: t.count,
          total_pnl: t.pnl,
          win_rate: t.closed > 0 ? (t.wins / t.closed) * 100 : 0,
        };
      })
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q);
  });

  return (
    <Card className="shadow-card overflow-hidden">
      <div className="p-4 border-b flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          <div className="font-semibold">{users.length} utilisateur{users.length > 1 ? "s" : ""}</div>
          <div className="text-xs text-muted-foreground">Stats agrégées sur tous les trades</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Rechercher email ou nom..." value={search} onChange={(e) => setSearch(e.target.value)} className="md:w-72" />
          <Button onClick={() => setInviteOpen(true)} className="gap-2"><UserPlus className="h-4 w-4" /> Inviter un membre</Button>
        </div>
      </div>

      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={load} />

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Aucun utilisateur.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2.5">Utilisateur</th>
                <th className="px-3 py-2.5">Statut</th>
                <th className="px-3 py-2.5">Rôles</th>
                <th className="px-3 py-2.5">Trades</th>
                <th className="px-3 py-2.5">Win rate</th>
                <th className="px-3 py-2.5">P&L total</th>
                <th className="px-3 py-2.5">Expire</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t hover:bg-secondary/30">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge s={u.status} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {u.roles.map((r) => <RoleBadge key={r} r={r} />)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">{u.trades_count}</td>
                  <td className="px-3 py-2.5">{u.trades_count > 0 ? `${u.win_rate.toFixed(0)}%` : "—"}</td>
                  <td className={`px-3 py-2.5 font-medium ${u.total_pnl > 0 ? "text-gain" : u.total_pnl < 0 ? "text-loss" : ""}`}>
                    {u.total_pnl !== 0 ? (
                      <span className="inline-flex items-center gap-1">
                        {u.total_pnl > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        ${u.total_pnl.toFixed(2)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {u.subscription_ends_at ? new Date(u.subscription_ends_at).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="outline" onClick={() => setActive(u)}>Gérer</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserManageDialog user={active} onClose={() => setActive(null)} onChanged={load} />
    </Card>
  );
}

function UserManageDialog({ user, onClose, onChanged }: { user: UserRow | null; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<string>("30");
  const [roleToAdd, setRoleToAdd] = useState<AppRole>("subscriber");

  if (!user) return null;

  async function setStatus(status: AccountStatus, addDays?: number) {
    setBusy(true);
    const ends = addDays ? new Date(Date.now() + addDays * 86400000).toISOString() : null;
    const update: any = { status };
    if (addDays !== undefined) update.subscription_ends_at = ends;
    const { error } = await supabase.from("profiles").update(update).eq("id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Compte mis à jour ✅");
    onChanged();
    onClose();
  }

  async function addRole(role: AppRole) {
    setBusy(true);
    const { error } = await supabase.from("user_roles").upsert(
      { user_id: user!.id, role: role as any },
      { onConflict: "user_id,role" }
    );
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Rôle ${role} ajouté`);
    onChanged();
  }

  async function removeRole(role: AppRole) {
    setBusy(true);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", user!.id).eq("role", role as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Rôle ${role} retiré`);
    onChanged();
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{user.full_name || user.email}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniStat label="Capital init." value={user.initial_capital != null ? `$${Number(user.initial_capital).toFixed(0)}` : "—"} />
            <MiniStat label="Trades" value={user.trades_count} />
            <MiniStat label="Win rate" value={user.trades_count > 0 ? `${user.win_rate.toFixed(0)}%` : "—"} />
            <MiniStat label="P&L" value={`$${user.total_pnl.toFixed(2)}`} accent={user.total_pnl > 0 ? "gain" : user.total_pnl < 0 ? "loss" : undefined} />
          </div>

          {/* Statut */}
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Statut du compte</div>
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge s={user.status} />
              {user.subscription_ends_at && (
                <span className="text-xs text-muted-foreground">expire le {new Date(user.subscription_ends_at).toLocaleDateString("fr-FR")}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Activer pour</Label>
                <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="w-20 h-9" />
                <span className="text-xs text-muted-foreground">jours</span>
                <Button size="sm" disabled={busy} onClick={() => setStatus("active", parseInt(days) || 30)}>
                  <UserCheck className="h-4 w-4" />Activer
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("active")}>
                Activer (illimité)
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("expired")}>
                <UserX className="h-4 w-4" />Désactiver
              </Button>
            </div>
          </div>

          {/* Roles */}
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Rôles</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {user.roles.length === 0 && <span className="text-xs text-muted-foreground">Aucun rôle</span>}
              {user.roles.map((r) => (
                <Badge key={r} variant="secondary" className="gap-1">
                  {r}
                  <button onClick={() => removeRole(r)} disabled={busy} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={roleToAdd} onValueChange={(v) => setRoleToAdd(v as AppRole)}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="student">student</SelectItem>
                  <SelectItem value="subscriber">subscriber</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" disabled={busy} onClick={() => addRole(roleToAdd)}>
                {roleToAdd === "admin" ? <Shield className="h-4 w-4" /> : null}
                Ajouter
              </Button>
            </div>
            {user.roles.includes("admin") && (
              <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1">
                <ShieldOff className="h-3 w-3" />
                Cliquez sur le × du badge admin pour retirer les droits.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "gain" | "loss" }) {
  return (
    <div className="rounded-md border bg-secondary/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-semibold ${accent === "gain" ? "text-gain" : accent === "loss" ? "text-loss" : ""}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ s }: { s: AccountStatus }) {
  if (s === "active") return <Badge className="bg-gain text-gain-foreground hover:bg-gain">Actif</Badge>;
  if (s === "expired") return <Badge className="bg-loss text-loss-foreground hover:bg-loss">Expiré</Badge>;
  return <Badge variant="secondary">En attente</Badge>;
}

function RoleBadge({ r }: { r: AppRole }) {
  if (r === "admin")
    return (
      <Badge className="bg-primary text-primary-foreground hover:bg-primary gap-1">
        <Shield className="h-3 w-3" />Admin
      </Badge>
    );
  if (r === "student")
    return (
      <Badge className="bg-accent text-accent-foreground hover:bg-accent gap-1 border-transparent">
        🎓 Étudiant
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1 border-gain/40 text-gain bg-gain/10">
      💳 Abonné
    </Badge>
  );
}

/* ================== INVITE USER DIALOG ================== */

function InviteUserDialog({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [offer, setOffer] = useState<OfferKey>("sub_1m");
  const [role, setRole] = useState<AppRole>("subscriber");
  const [customDays, setCustomDays] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; temp_password: string | null; is_new: boolean; expires_at: string | null } | null>(null);

  function reset() {
    setEmail(""); setFullName(""); setOffer("sub_1m"); setRole("subscriber"); setCustomDays(""); setResult(null);
  }

  async function submit() {
    if (!email.trim()) return toast.error("Email requis");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-invite-user", {
      body: {
        email: email.trim(),
        full_name: fullName.trim(),
        offer,
        role,
        custom_days: customDays ? Number(customDays) : null,
      },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Erreur");
      return;
    }
    setResult(data as any);
    toast.success((data as any).is_new ? "Compte créé et activé ✅" : "Compte existant activé ✅");
    onInvited();
  }

  function close() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-accent" /> Inviter un membre</DialogTitle>
          <DialogDescription>
            Crée un compte ou active un compte existant sans paiement. L'utilisateur reçoit un accès immédiat.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email *</Label>
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="membre@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Nom complet (optionnel)</Label>
              <Input id="inv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Dupont" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Offre / accès</Label>
                <Select value={offer} onValueChange={(v) => setOffer(v as OfferKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OFFERS) as OfferKey[]).map((k) => (
                      <SelectItem key={k} value={k}>{OFFERS[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscriber">💳 Abonné</SelectItem>
                    <SelectItem value="student">🎓 Étudiant</SelectItem>
                    <SelectItem value="admin">🛡️ Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-days">Durée personnalisée en jours (optionnel)</Label>
              <Input id="inv-days" type="number" min={1} value={customDays} onChange={(e) => setCustomDays(e.target.value)} placeholder="Vide = durée de l'offre" />
              <p className="text-xs text-muted-foreground">Laisse vide pour utiliser la durée par défaut de l'offre. La formation est illimitée.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-gain/40 bg-gain/10 p-4 space-y-2">
              <div className="font-semibold text-gain flex items-center gap-2">✅ {result.is_new ? "Compte créé" : "Compte activé"}</div>
              <Row k="Email" v={result.email} />
              {result.expires_at && <Row k="Expire le" v={new Date(result.expires_at).toLocaleDateString("fr-FR")} />}
            </div>
            {result.temp_password && (
              <div className="rounded-md border border-accent/40 bg-accent/10 p-4 space-y-2">
                <div className="text-xs uppercase tracking-wide text-accent font-mono">Mot de passe temporaire</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm bg-background px-3 py-2 rounded border break-all">{result.temp_password}</code>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(result.temp_password!); toast.success("Copié"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">⚠️ Communique ce mot de passe au membre via WhatsApp ou email. Il pourra le changer dans son profil.</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={close} disabled={busy}>Annuler</Button>
              <Button onClick={submit} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer et activer
              </Button>
            </>
          ) : (
            <Button onClick={close}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================== PAYMENTS TAB (existing logic) ================== */

function PaymentsTab() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PaymentRow | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, email, full_name").in("id", userIds);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setRows(data.map((r: any) => ({ ...r, profiles: map.get(r.user_id) ?? null })));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function openDetail(row: PaymentRow) {
    setActive(row);
    setAdminNote(row.admin_note ?? "");
    setProofUrl(null);
    if (row.proof_path) {
      const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(row.proof_path, 600);
      setProofUrl(data?.signedUrl ?? null);
    }
  }

  async function decide(approve: boolean) {
    if (!active) return;
    setBusy(true);

    const { error } = await supabase.from("payment_requests").update({
      status: approve ? "approved" : "rejected",
      admin_note: adminNote || null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", active.id);

    if (error) { toast.error(error.message); setBusy(false); return; }

    if (approve) {
      const offer = OFFERS[active.offer];
      const role = offer.type === "formation" ? "student" : "subscriber";
      const ends = offer.durationDays
        ? new Date(Date.now() + offer.durationDays * 86400000).toISOString()
        : null;

      await supabase.from("user_roles").upsert(
        { user_id: active.user_id, role: role as any },
        { onConflict: "user_id,role" }
      );
      await supabase.from("profiles").update({
        status: "active",
        subscription_ends_at: ends,
      }).eq("id", active.user_id);
    }

    toast.success(approve ? "Compte activé ✅" : "Demande rejetée");
    setActive(null);
    setBusy(false);
    load();
  }

  return (
    <Card className="shadow-card overflow-hidden">
      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Aucune demande pour le moment.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Utilisateur</th>
                <th className="px-3 py-2.5">Offre</th>
                <th className="px-3 py-2.5">Montant</th>
                <th className="px-3 py-2.5">Méthode</th>
                <th className="px-3 py-2.5">Statut</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-secondary/30">
                  <td className="px-3 py-2.5">{new Date(r.created_at).toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{r.profiles?.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.profiles?.email}</div>
                  </td>
                  <td className="px-3 py-2.5">{OFFERS[r.offer]?.label}</td>
                  <td className="px-3 py-2.5 font-medium">{formatFCFA(r.amount_fcfa)}</td>
                  <td className="px-3 py-2.5 uppercase text-xs">{r.method}</td>
                  <td className="px-3 py-2.5">
                    {r.status === "pending" && <Badge variant="secondary">En attente</Badge>}
                    {r.status === "approved" && <Badge className="bg-gain text-gain-foreground hover:bg-gain">Validé</Badge>}
                    {r.status === "rejected" && <Badge className="bg-loss text-loss-foreground hover:bg-loss">Rejeté</Badge>}
                  </td>
                  <td className="px-3 py-2.5"><Button size="sm" variant="outline" onClick={() => openDetail(r)}>Examiner</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Demande de paiement</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <Row k="Utilisateur" v={`${active.profiles?.full_name ?? ""} (${active.profiles?.email ?? ""})`} />
              <Row k="Offre" v={`${OFFERS[active.offer]?.label} — ${formatFCFA(active.amount_fcfa)}`} />
              <Row k="Méthode" v={active.method.toUpperCase()} />
              <Row k="N° payeur" v={active.payer_phone ?? "—"} />
              {active.note && <Row k="Note" v={active.note} />}
              {proofUrl ? (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Preuve</div>
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={proofUrl} alt="Preuve" className="max-h-64 rounded border" />
                  </a>
                  <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent inline-flex items-center gap-1 mt-1">Ouvrir <ExternalLink className="h-3 w-3" /></a>
                </div>
              ) : active.proof_path ? <div className="text-xs text-muted-foreground">Chargement preuve...</div> : <div className="text-xs text-muted-foreground">Pas de preuve uploadée (à voir sur WhatsApp).</div>}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Note admin</div>
                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} maxLength={500} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => decide(false)} disabled={busy}>Rejeter</Button>
            <Button onClick={() => decide(true)} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Valider et activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-4 border-b pb-1.5"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></div>
);

export default Admin;
