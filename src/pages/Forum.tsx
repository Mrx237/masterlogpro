import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageSquare, Heart, Pin, Plus, ArrowLeft, Loader2, Send, Trash2, Search, Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Category = "analyse" | "strategie" | "psychologie" | "question" | "general";

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: "analyse",    label: "Analyse",     color: "bg-primary/15 text-primary border-primary/30" },
  { value: "strategie",  label: "Stratégie",   color: "bg-accent/15 text-accent border-accent/30" },
  { value: "psychologie",label: "Psychologie", color: "bg-warn/15 text-warn border-warn/30" },
  { value: "question",   label: "Question",    color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { value: "general",    label: "Général",     color: "bg-muted text-muted-foreground border-border" },
];

const catMeta = (c: string) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[4];

interface Topic {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: Category;
  is_pinned: boolean;
  reply_count: number;
  like_count: number;
  last_activity_at: string;
  created_at: string;
  author?: { full_name: string | null; email: string | null } | null;
  liked_by_me?: boolean;
}

interface Reply {
  id: string;
  user_id: string;
  content: string;
  like_count: number;
  created_at: string;
  author?: { full_name: string | null; email: string | null } | null;
  liked_by_me?: boolean;
}

const db = supabase as any;

function initials(name?: string | null, email?: string | null) {
  const src = (name && name.trim()) || (email ?? "?");
  return src.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";
}

function Avatar({ name, email }: { name?: string | null; email?: string | null }) {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-brand text-primary-foreground font-bold text-xs">
      {initials(name, email)}
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const m = catMeta(category);
  return (
    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${m.color}`}>
      {m.label}
    </span>
  );
}

/* ---------------------------- LIST VIEW ---------------------------- */
function ForumList() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "general" as Category });

  async function load() {
    setLoading(true);
    let query = db
      .from("forum_topics")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .limit(100);
    if (filter !== "all") query = query.eq("category", filter);
    const { data, error } = await query;
    if (error) {
      toast.error("Impossible de charger les sujets");
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Topic[];
    const ids = Array.from(new Set(list.map((t) => t.user_id)));
    let authors: Record<string, { full_name: string | null; email: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await db
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      authors = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    let myLikes = new Set<string>();
    if (user) {
      const { data: likes } = await db
        .from("forum_likes")
        .select("target_id")
        .eq("user_id", user.id)
        .eq("target_type", "topic")
        .in("target_id", list.map((t) => t.id));
      myLikes = new Set((likes ?? []).map((l: any) => l.target_id));
    }
    setTopics(list.map((t) => ({ ...t, author: authors[t.user_id] ?? null, liked_by_me: myLikes.has(t.id) })));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user?.id]);

  const filtered = useMemo(() => {
    if (!q.trim()) return topics;
    const k = q.toLowerCase();
    return topics.filter((t) => t.title.toLowerCase().includes(k) || t.content.toLowerCase().includes(k));
  }, [topics, q]);

  async function createTopic() {
    if (!user) {
      toast.error("Connecte-toi pour publier");
      navigate("/auth");
      return;
    }
    const title = form.title.trim();
    const content = form.content.trim();
    if (title.length < 5) return toast.error("Titre trop court (5 caractères min)");
    if (content.length < 10) return toast.error("Contenu trop court (10 caractères min)");
    setSubmitting(true);
    const { data, error } = await db.from("forum_topics").insert({
      user_id: user.id, title, content, category: form.category,
    }).select("id").single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Sujet publié");
    setOpen(false);
    setForm({ title: "", content: "", category: "general" });
    navigate(`/forum/${data.id}`);
  }

  async function toggleLike(t: Topic) {
    if (!user) { toast.error("Connecte-toi pour liker"); return; }
    if (t.liked_by_me) {
      await db.from("forum_likes").delete()
        .eq("user_id", user.id).eq("target_type", "topic").eq("target_id", t.id);
    } else {
      await db.from("forum_likes").insert({ user_id: user.id, target_type: "topic", target_id: t.id });
    }
    setTopics((prev) => prev.map((x) => x.id === t.id
      ? { ...x, liked_by_me: !t.liked_by_me, like_count: x.like_count + (t.liked_by_me ? -1 : 1) }
      : x));
  }

  async function deleteTopic(t: Topic) {
    if (!confirm("Supprimer ce sujet ?")) return;
    const { error } = await db.from("forum_topics").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé");
    setTopics((p) => p.filter((x) => x.id !== t.id));
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 md:py-12">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl glass-strong p-6 md:p-10 mb-8">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Communauté
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight">
              Forum <span className="text-gradient-brand">des traders</span>
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Partagez vos analyses, vos setups, vos erreurs et apprenez ensemble.
              Une communauté constructive, sans bruit, centrée sur la progression.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-gradient-brand text-primary-foreground hover:opacity-90 border-0">
                    <Plus className="h-4 w-4" /> Nouveau sujet
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Créer un sujet</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Catégorie</label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Titre</label>
                      <Input
                        placeholder="Ex: Comment lire le contexte avant un NFP ?"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        maxLength={160}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Contenu</label>
                      <Textarea
                        placeholder="Partage ton analyse, ta question, ton retour d'expérience..."
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        rows={8}
                        maxLength={8000}
                      />
                      <div className="text-xs text-muted-foreground mt-1">{form.content.length}/8000</div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button onClick={createTopic} disabled={submitting} className="bg-gradient-brand text-primary-foreground border-0">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Publier
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un sujet..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              filter === "all" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >Tous</button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                filter === c.value ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >{c.label}</button>
          ))}
        </div>

        {/* Topics */}
        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="glass border-dashed">
            <CardContent className="py-16 text-center">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun sujet pour le moment. Sois le premier à publier !</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <Card key={t.id} className="glass hover:bg-surface-elevated/60 transition-all group">
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <Avatar name={t.author?.full_name} email={t.author?.email} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {t.is_pinned && <Pin className="h-3.5 w-3.5 text-warn" />}
                        <CategoryBadge category={t.category} />
                        <span className="text-xs text-muted-foreground">
                          par <span className="text-foreground/80">{t.author?.full_name || t.author?.email?.split("@")[0] || "Trader"}</span> · {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                      <Link to={`/forum/${t.id}`} className="block">
                        <h3 className="font-display font-semibold text-lg leading-snug group-hover:text-primary transition-colors">
                          {t.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.content}</p>
                      </Link>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <button
                          onClick={() => toggleLike(t)}
                          className={`inline-flex items-center gap-1.5 hover:text-foreground transition ${t.liked_by_me ? "text-rose-400" : ""}`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${t.liked_by_me ? "fill-current" : ""}`} />
                          {t.like_count}
                        </button>
                        <Link to={`/forum/${t.id}`} className="inline-flex items-center gap-1.5 hover:text-foreground transition">
                          <MessageSquare className="h-3.5 w-3.5" /> {t.reply_count} réponse{t.reply_count > 1 ? "s" : ""}
                        </Link>
                        {(user?.id === t.user_id || isAdmin) && (
                          <button onClick={() => deleteTopic(t)} className="ml-auto hover:text-destructive transition inline-flex items-center gap-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------------------------- DETAIL VIEW ---------------------------- */
function ForumDetail({ id }: { id: string }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    const { data: t, error } = await db.from("forum_topics").select("*").eq("id", id).maybeSingle();
    if (error || !t) { toast.error("Sujet introuvable"); navigate("/forum"); return; }
    const { data: rs } = await db.from("forum_replies").select("*").eq("topic_id", id).order("created_at", { ascending: true });
    const rList = (rs ?? []) as Reply[];
    const ids = Array.from(new Set<string>([t.user_id, ...rList.map((r) => r.user_id)]));
    const { data: profs } = await db.from("profiles").select("id, full_name, email").in("id", ids);
    const authors = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    let likedTopic = false; const replyLikes = new Set<string>();
    if (user) {
      const { data: tLike } = await db.from("forum_likes").select("id").eq("user_id", user.id)
        .eq("target_type", "topic").eq("target_id", id).maybeSingle();
      likedTopic = !!tLike;
      if (rList.length) {
        const { data: rLikes } = await db.from("forum_likes").select("target_id")
          .eq("user_id", user.id).eq("target_type", "reply").in("target_id", rList.map((r) => r.id));
        (rLikes ?? []).forEach((l: any) => replyLikes.add(l.target_id));
      }
    }
    setTopic({ ...t, author: authors[t.user_id] ?? null, liked_by_me: likedTopic });
    setReplies(rList.map((r) => ({ ...r, author: authors[r.user_id] ?? null, liked_by_me: replyLikes.has(r.id) })));
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  async function postReply() {
    if (!user) { toast.error("Connecte-toi pour répondre"); navigate("/auth"); return; }
    const c = replyText.trim();
    if (c.length < 1) return;
    setPosting(true);
    const { error } = await db.from("forum_replies").insert({ topic_id: id, user_id: user.id, content: c });
    setPosting(false);
    if (error) return toast.error(error.message);
    setReplyText("");
    load();
  }

  async function toggleLike(target: "topic" | "reply", targetId: string, liked: boolean) {
    if (!user) { toast.error("Connecte-toi pour liker"); return; }
    if (liked) {
      await db.from("forum_likes").delete().eq("user_id", user.id).eq("target_type", target).eq("target_id", targetId);
    } else {
      await db.from("forum_likes").insert({ user_id: user.id, target_type: target, target_id: targetId });
    }
    if (target === "topic" && topic) setTopic({ ...topic, liked_by_me: !liked, like_count: topic.like_count + (liked ? -1 : 1) });
    if (target === "reply") setReplies((p) => p.map((r) => r.id === targetId ? { ...r, liked_by_me: !liked, like_count: r.like_count + (liked ? -1 : 1) } : r));
  }

  async function deleteReply(rid: string) {
    if (!confirm("Supprimer cette réponse ?")) return;
    const { error } = await db.from("forum_replies").delete().eq("id", rid);
    if (error) return toast.error(error.message);
    setReplies((p) => p.filter((r) => r.id !== rid));
  }

  async function deleteTopicAndBack() {
    if (!topic) return;
    if (!confirm("Supprimer ce sujet ?")) return;
    const { error } = await db.from("forum_topics").delete().eq("id", topic.id);
    if (error) return toast.error(error.message);
    navigate("/forum");
  }

  if (loading || !topic) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/forum"><ArrowLeft className="h-4 w-4" /> Retour au forum</Link>
        </Button>

        <Card className="glass-strong">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CategoryBadge category={topic.category} />
              {topic.is_pinned && <Badge variant="secondary"><Pin className="h-3 w-3" /> Épinglé</Badge>}
            </div>
            <CardTitle className="font-display text-2xl md:text-3xl">{topic.title}</CardTitle>
            <div className="flex items-center gap-3 mt-3">
              <Avatar name={topic.author?.full_name} email={topic.author?.email} />
              <div>
                <div className="text-sm font-medium">{topic.author?.full_name || topic.author?.email?.split("@")[0] || "Trader"}</div>
                <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: fr })}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {topic.content}
            </div>
            <div className="mt-6 flex items-center gap-4 pt-4 border-t border-border/50">
              <button
                onClick={() => toggleLike("topic", topic.id, !!topic.liked_by_me)}
                className={`inline-flex items-center gap-1.5 text-sm hover:text-foreground transition ${topic.liked_by_me ? "text-rose-400" : "text-muted-foreground"}`}
              >
                <Heart className={`h-4 w-4 ${topic.liked_by_me ? "fill-current" : ""}`} /> {topic.like_count}
              </button>
              <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" /> {topic.reply_count}
              </div>
              {(user?.id === topic.user_id || isAdmin) && (
                <button onClick={deleteTopicAndBack} className="ml-auto text-sm text-muted-foreground hover:text-destructive transition inline-flex items-center gap-1">
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold mb-4">
            {replies.length} réponse{replies.length > 1 ? "s" : ""}
          </h2>
          <div className="space-y-3">
            {replies.map((r) => (
              <Card key={r.id} className="glass">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Avatar name={r.author?.full_name} email={r.author?.email} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{r.author?.full_name || r.author?.email?.split("@")[0] || "Trader"}</span>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{r.content}</div>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <button
                          onClick={() => toggleLike("reply", r.id, !!r.liked_by_me)}
                          className={`inline-flex items-center gap-1 hover:text-foreground transition ${r.liked_by_me ? "text-rose-400" : "text-muted-foreground"}`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${r.liked_by_me ? "fill-current" : ""}`} /> {r.like_count}
                        </button>
                        {(user?.id === r.user_id || isAdmin) && (
                          <button onClick={() => deleteReply(r.id)} className="ml-auto text-muted-foreground hover:text-destructive transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Reply form */}
          <Card className="mt-6 glass">
            <CardContent className="p-4">
              {user ? (
                <>
                  <Textarea
                    placeholder="Partage ton avis, ton retour, une question..."
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    maxLength={5000}
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{replyText.length}/5000</span>
                    <Button onClick={postReply} disabled={posting || !replyText.trim()} className="bg-gradient-brand text-primary-foreground border-0">
                      {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Répondre
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">Connecte-toi pour participer à la discussion.</p>
                  <Button asChild className="bg-gradient-brand text-primary-foreground border-0">
                    <Link to="/auth">Se connecter</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

/* ---------------------------- ROUTER WRAPPER ---------------------------- */
export default function Forum() {
  const { id } = useParams();
  return id ? <ForumDetail id={id} /> : <ForumList />;
}
