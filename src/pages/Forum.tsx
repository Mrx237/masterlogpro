import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageSquare, Heart, Pin, Plus, ArrowLeft, Loader2, Send, Trash2, Search, Sparkles, Hash,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
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

function colorFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 70% 45%)`;
}

function Avatar({ name, email, userId, size = 36 }: { name?: string | null; email?: string | null; userId?: string; size?: number }) {
  const bg = userId ? colorFromId(userId) : undefined;
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.36, background: bg || "linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))" }}
    >
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

function smartDate(d: string) {
  const date = new Date(d);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Hier " + format(date, "HH:mm");
  return format(date, "d MMM HH:mm", { locale: fr });
}

/* ---------------------------- LIST VIEW (Conversations) ---------------------------- */
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
    if (error) { toast.error("Impossible de charger les discussions"); setLoading(false); return; }
    const list = (data ?? []) as Topic[];
    const ids = Array.from(new Set(list.map((t) => t.user_id)));
    let authors: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await db.from("profiles").select("id, full_name, email").in("id", ids);
      authors = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    setTopics(list.map((t) => ({ ...t, author: authors[t.user_id] ?? null })));
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  // Realtime: bump list on new topic / activity
  useEffect(() => {
    const ch = supabase
      .channel("forum_topics_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_topics" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [filter]);

  const filtered = useMemo(() => {
    if (!q.trim()) return topics;
    const k = q.toLowerCase();
    return topics.filter((t) => t.title.toLowerCase().includes(k) || t.content.toLowerCase().includes(k));
  }, [topics, q]);

  async function createTopic() {
    if (!user) { toast.error("Connecte-toi pour publier"); navigate("/auth"); return; }
    const title = form.title.trim();
    const content = form.content.trim();
    if (title.length < 3) return toast.error("Titre trop court");
    if (content.length < 1) return toast.error("Écris un premier message");
    setSubmitting(true);
    const { data, error } = await db.from("forum_topics").insert({
      user_id: user.id, title, content, category: form.category,
    }).select("id").single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Discussion créée");
    setOpen(false);
    setForm({ title: "", content: "", category: "general" });
    navigate(`/forum/${data.id}`);
  }

  async function deleteTopic(t: Topic, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Supprimer cette discussion ?")) return;
    const { error } = await db.from("forum_topics").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    setTopics((p) => p.filter((x) => x.id !== t.id));
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-10 max-w-5xl">
        {/* Hero compact */}
        <div className="relative overflow-hidden rounded-2xl glass-strong p-5 md:p-7 mb-6">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary mb-2">
                <Sparkles className="h-3.5 w-3.5" /> Chat communautaire
              </div>
              <h1 className="font-display text-2xl md:text-4xl font-bold leading-tight">
                Discussions <span className="text-gradient-brand">traders</span>
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
                Rejoins une conversation, partage ton setup, pose tes questions — en direct.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-gradient-brand text-primary-foreground hover:opacity-90 border-0 shrink-0">
                  <Plus className="h-4 w-4" /> Nouvelle discussion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Démarrer une discussion</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Salon</label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>#{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Sujet</label>
                    <Input
                      placeholder="Ex: Setup NFP de demain ?"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      maxLength={160}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Premier message</label>
                    <Textarea
                      placeholder="Lance la discussion..."
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      rows={5}
                      maxLength={4000}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button onClick={createTopic} disabled={submitting} className="bg-gradient-brand text-primary-foreground border-0">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Lancer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher une discussion..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              filter === "all" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >Tous les salons</button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition inline-flex items-center gap-1 ${
                filter === c.value ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            ><Hash className="h-3 w-3" />{c.label}</button>
          ))}
        </div>

        {/* Conversation list (chat-style) */}
        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl border border-dashed border-border py-16 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune discussion pour le moment.</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden divide-y divide-border/60">
            {filtered.map((t) => {
              const authorName = t.author?.full_name || t.author?.email?.split("@")[0] || "Trader";
              return (
                <Link
                  key={t.id}
                  to={`/forum/${t.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-surface-elevated/60 transition-colors group relative"
                >
                  <Avatar name={t.author?.full_name} email={t.author?.email} userId={t.user_id} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {t.is_pinned && <Pin className="h-3 w-3 text-warn" />}
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {t.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <CategoryBadge category={t.category} />
                      <span className="truncate">{authorName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{t.content}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5 text-xs text-muted-foreground">
                    <span>{smartDate(t.last_activity_at || t.created_at)}</span>
                    <div className="flex items-center gap-2">
                      {t.reply_count > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold">
                          {t.reply_count}
                        </span>
                      )}
                      {(user?.id === t.user_id || isAdmin) && (
                        <button onClick={(e) => deleteTopic(t, e)} className="opacity-0 group-hover:opacity-100 hover:text-destructive transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------------------------- CHAT VIEW ---------------------------- */
type ChatItem = (Reply & { _isTopic?: boolean }) | (Topic & { _isTopic: true });

function ForumChat({ id }: { id: string }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [authors, setAuthors] = useState<Record<string, { full_name: string | null; email: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function ensureAuthors(ids: string[]) {
    const missing = ids.filter((i) => i && !authors[i]);
    if (!missing.length) return;
    const { data } = await db.from("profiles").select("id, full_name, email").in("id", missing);
    if (data) {
      setAuthors((prev) => ({ ...prev, ...Object.fromEntries(data.map((p: any) => [p.id, p])) }));
    }
  }

  async function load() {
    setLoading(true);
    const { data: t, error } = await db.from("forum_topics").select("*").eq("id", id).maybeSingle();
    if (error || !t) { toast.error("Discussion introuvable"); navigate("/forum"); return; }
    const { data: rs } = await db.from("forum_replies").select("*").eq("topic_id", id).order("created_at", { ascending: true });
    const rList = (rs ?? []) as Reply[];
    const ids = Array.from(new Set<string>([t.user_id, ...rList.map((r) => r.user_id)]));
    const { data: profs } = await db.from("profiles").select("id, full_name, email").in("id", ids);
    setAuthors(Object.fromEntries((profs ?? []).map((p: any) => [p.id, p])));
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
    setTopic({ ...t, liked_by_me: likedTopic });
    setReplies(rList.map((r) => ({ ...r, liked_by_me: replyLikes.has(r.id) })));
    setLoading(false);
    setTimeout(() => scrollToBottom("auto"), 50);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  // Realtime new messages
  useEffect(() => {
    const ch = supabase
      .channel(`forum_chat_${id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "forum_replies", filter: `topic_id=eq.${id}` },
        async (payload) => {
          const r = payload.new as Reply;
          await ensureAuthors([r.user_id]);
          setReplies((prev) => prev.some((x) => x.id === r.id) ? prev : [...prev, r]);
          setTimeout(() => scrollToBottom("smooth"), 30);
        })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "forum_replies", filter: `topic_id=eq.${id}` },
        (payload) => {
          const r = payload.old as Reply;
          setReplies((prev) => prev.filter((x) => x.id !== r.id));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [id]);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }

  async function send() {
    if (!user) { toast.error("Connecte-toi pour participer"); navigate("/auth"); return; }
    const c = text.trim();
    if (!c) return;
    setPosting(true);
    const { data, error } = await db.from("forum_replies").insert({
      topic_id: id, user_id: user.id, content: c,
    }).select("*").single();
    setPosting(false);
    if (error) return toast.error(error.message);
    setText("");
    // Optimistic add (realtime may also push it)
    setReplies((prev) => prev.some((x) => x.id === data.id) ? prev : [...prev, data]);
    await ensureAuthors([user.id]);
    setTimeout(() => scrollToBottom("smooth"), 30);
  }

  async function toggleLike(target: "topic" | "reply", targetId: string, liked: boolean) {
    if (!user) { toast.error("Connecte-toi pour réagir"); return; }
    if (liked) {
      await db.from("forum_likes").delete().eq("user_id", user.id).eq("target_type", target).eq("target_id", targetId);
    } else {
      await db.from("forum_likes").insert({ user_id: user.id, target_type: target, target_id: targetId });
    }
    if (target === "topic" && topic) setTopic({ ...topic, liked_by_me: !liked, like_count: topic.like_count + (liked ? -1 : 1) });
    if (target === "reply") setReplies((p) => p.map((r) => r.id === targetId ? { ...r, liked_by_me: !liked, like_count: r.like_count + (liked ? -1 : 1) } : r));
  }

  async function deleteReply(rid: string) {
    if (!confirm("Supprimer ce message ?")) return;
    const { error } = await db.from("forum_replies").delete().eq("id", rid);
    if (error) return toast.error(error.message);
    setReplies((p) => p.filter((r) => r.id !== rid));
  }

  async function deleteTopicAndBack() {
    if (!topic) return;
    if (!confirm("Supprimer cette discussion ?")) return;
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

  // Build the message stream: topic body as the first message
  const stream: ChatItem[] = [
    { ...topic, _isTopic: true } as ChatItem,
    ...replies,
  ];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <AppHeader />

      {/* Channel header */}
      <div className="border-b border-border/60 bg-surface-elevated/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="container max-w-3xl py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/forum"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <CategoryBadge category={topic.category} />
              {topic.is_pinned && <Badge variant="secondary" className="h-5"><Pin className="h-3 w-3" /></Badge>}
            </div>
            <h2 className="font-semibold truncate text-sm md:text-base">{topic.title}</h2>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {topic.reply_count}</span>
            <button
              onClick={() => toggleLike("topic", topic.id, !!topic.liked_by_me)}
              className={`inline-flex items-center gap-1 hover:text-foreground transition ${topic.liked_by_me ? "text-rose-400" : ""}`}
            >
              <Heart className={`h-3.5 w-3.5 ${topic.liked_by_me ? "fill-current" : ""}`} /> {topic.like_count}
            </button>
            {(user?.id === topic.user_id || isAdmin) && (
              <button onClick={deleteTopicAndBack} className="hover:text-destructive transition">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl py-6 space-y-1">
          {stream.map((item, idx) => {
            const isTopic = !!(item as any)._isTopic;
            const m = item as Reply;
            const mine = user?.id === m.user_id;
            const prev = stream[idx - 1] as Reply | undefined;
            const prevIsMine = prev && (prev as any).user_id === m.user_id && !((prev as any)._isTopic);
            const sameAuthorAsPrev = !isTopic && prev && !((prev as any)._isTopic) && prev.user_id === m.user_id
              && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000);
            const author = authors[m.user_id];
            const authorName = author?.full_name || author?.email?.split("@")[0] || "Trader";

            // Date separator
            const showDateSep = !prev || new Date((prev as any).created_at).toDateString() !== new Date(m.created_at).toDateString();

            return (
              <div key={m.id}>
                {showDateSep && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      {format(new Date(m.created_at), "EEEE d MMMM", { locale: fr })}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>
                )}

                <div className={`group flex gap-2.5 ${mine ? "flex-row-reverse" : ""} ${sameAuthorAsPrev ? "mt-0.5" : "mt-3"}`}>
                  <div className="w-9 shrink-0">
                    {!sameAuthorAsPrev && (
                      <Avatar name={author?.full_name} email={author?.email} userId={m.user_id} size={36} />
                    )}
                  </div>
                  <div className={`flex flex-col max-w-[78%] ${mine ? "items-end" : "items-start"}`}>
                    {!sameAuthorAsPrev && (
                      <div className={`flex items-center gap-2 mb-1 text-xs ${mine ? "flex-row-reverse" : ""}`}>
                        <span className="font-semibold text-foreground/90">{mine ? "Toi" : authorName}</span>
                        <span className="text-muted-foreground">{smartDate(m.created_at)}</span>
                        {isTopic && <Badge variant="secondary" className="h-4 text-[9px] uppercase tracking-wider">Sujet</Badge>}
                      </div>
                    )}
                    <div
                      className={`relative px-4 py-2.5 rounded-2xl whitespace-pre-wrap break-words text-sm leading-relaxed shadow-sm ${
                        mine
                          ? "bg-gradient-brand text-primary-foreground rounded-tr-sm"
                          : "bg-surface-elevated border border-border/60 text-foreground rounded-tl-sm"
                      } ${isTopic ? "ring-1 ring-primary/30" : ""}`}
                    >
                      {isTopic ? (topic.content) : m.content}

                      {/* Hover actions */}
                      <div className={`absolute -top-3 ${mine ? "left-2" : "right-2"} opacity-0 group-hover:opacity-100 transition flex items-center gap-1 bg-background border border-border/60 rounded-full px-1.5 py-0.5 shadow`}>
                        <button
                          onClick={() => isTopic
                            ? toggleLike("topic", topic.id, !!topic.liked_by_me)
                            : toggleLike("reply", m.id, !!(m as Reply).liked_by_me)}
                          className={`p-1 hover:text-rose-400 transition ${
                            (isTopic ? topic.liked_by_me : (m as Reply).liked_by_me) ? "text-rose-400" : "text-muted-foreground"
                          }`}
                          title="Aimer"
                        >
                          <Heart className={`h-3.5 w-3.5 ${(isTopic ? topic.liked_by_me : (m as Reply).liked_by_me) ? "fill-current" : ""}`} />
                        </button>
                        {!isTopic && (user?.id === m.user_id || isAdmin) && (
                          <button
                            onClick={() => deleteReply(m.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {((isTopic ? topic.like_count : (m as Reply).like_count) > 0) && (
                      <div className={`mt-1 inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-surface-elevated border border-border/60 ${mine ? "self-end" : "self-start"}`}>
                        <Heart className="h-3 w-3 text-rose-400 fill-current" />
                        <span className="text-muted-foreground">{isTopic ? topic.like_count : (m as Reply).like_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border/60 bg-surface-elevated/40 backdrop-blur-xl sticky bottom-0">
        <div className="container max-w-3xl py-3">
          {user ? (
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-end gap-2 glass rounded-2xl p-2 pl-4"
            >
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={`Message dans #${catMeta(topic.category).label}...`}
                rows={1}
                maxLength={5000}
                className="flex-1 min-h-[40px] max-h-[160px] resize-none border-0 bg-transparent focus-visible:ring-0 px-0 py-2 text-sm"
              />
              <Button
                type="submit"
                disabled={posting || !text.trim()}
                size="icon"
                className="bg-gradient-brand text-primary-foreground border-0 shrink-0 h-10 w-10 rounded-xl"
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          ) : (
            <div className="glass rounded-2xl p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">Connecte-toi pour participer à la discussion.</p>
              <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground border-0">
                <Link to="/auth">Se connecter</Link>
              </Button>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Entrée pour envoyer · Maj+Entrée pour aller à la ligne
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- ROUTER WRAPPER ---------------------------- */
export default function Forum() {
  const { id } = useParams();
  return id ? <ForumChat id={id} /> : <ForumList />;
}
