import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import type { MediaKind } from "@/lib/forumMedia";

export function MessageMedia({ path, kind, name }: { path: string; kind: MediaKind; name?: string | null }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    supabase.storage.from("forum-media").createSignedUrl(path, 3600).then(({ data, error }) => {
      if (active) { setUrl(data?.signedUrl ?? ""); setError(!!error); }
    });
    const timer = window.setInterval(() => setRetry(v => v + 1), 50 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, [path, retry]);
  if (error) return <Button variant="ghost" size="sm" onClick={() => setRetry(v => v + 1)}><RefreshCw className="h-4 w-4" />Recharger le média</Button>;
  if (!url) return <Loader2 className="h-5 w-5 animate-spin" aria-label="Chargement du média" />;
  if (kind === "image") return <a href={url} target="_blank" rel="noopener noreferrer" className="block"><img src={url} alt={name || "Photo partagée"} loading="lazy" className="max-h-80 w-full max-w-sm object-contain rounded-lg" /></a>;
  if (kind === "video") return <video src={url} controls playsInline preload="metadata" className="max-h-80 w-full max-w-sm rounded-lg" aria-label={name || "Vidéo partagée"} />;
  return <audio src={url} controls preload="metadata" className="w-full min-w-0 max-w-sm" aria-label="Message vocal" />;
}