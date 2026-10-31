import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Video, Mic, Square, X, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { validateForumMedia } from "@/lib/forumMedia";

export function MediaComposer({ posting, onSend, placeholder }: { posting: boolean; onSend: (text: string, file: File | null) => Promise<boolean>; placeholder: string }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const sending = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds(v => v + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  function chooseFile(value: File | null) {
    if (!value) return;
    try { validateForumMedia(value); setFile(value); } catch (e) { toast.error((e as Error).message); }
  }
  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast.error("L’enregistrement vocal n’est pas disponible sur ce navigateur."); return; }
    setRequesting(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find(t => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        media.getTracks().forEach(t => t.stop());
        if (!mounted.current) return;
        setRecording(false);
        const type = rec.mimeType.split(";")[0];
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        chooseFile(new File(chunks, `Vocal-${Date.now()}.${ext}`, { type }));
      };
      rec.onerror = () => { media.getTracks().forEach(t => t.stop()); setRecording(false); toast.error("Enregistrement interrompu."); };
      setSeconds(0); rec.start(); setRecording(true);
    } catch { stream.current?.getTracks().forEach(t => t.stop()); toast.error("Microphone inaccessible. Autorise son utilisation dans ton navigateur."); }
    finally { if (mounted.current) setRequesting(false); }
  }
  async function submit() {
    if (posting || sending.current || recording || requesting || (!text.trim() && !file)) return;
    sending.current = true;
    try { if (await onSend(text.trim(), file)) { setText(""); setFile(null); } }
    finally { sending.current = false; }
  }
  const kind = file ? validateForumMedia(file) : null;
  return <form onSubmit={e => { e.preventDefault(); void submit(); }} className="rounded-lg border border-border bg-background/80 p-2 space-y-2">
    <input ref={input} type="file" className="hidden" aria-label="Joindre un média" disabled={posting || recording || requesting} onChange={e => { chooseFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
    {file && <div className="flex items-center gap-3 border-b border-border pb-2 min-w-0">
      {kind === "image" && <img src={preview} alt="Photo à envoyer" className="h-16 w-16 object-cover rounded-lg" />}
      {kind === "video" && <video src={preview} controls playsInline className="h-24 w-32 rounded-lg" />}
      {kind === "audio" && <audio src={preview} controls className="w-full min-w-0 h-10" />}
      {kind !== "audio" && <span className="text-xs text-muted-foreground truncate flex-1">{file.name}</span>}
      <Button type="button" size="icon" variant="ghost" aria-label="Retirer le média" title="Retirer le média" disabled={posting} onClick={() => setFile(null)} className="shrink-0"><X className="h-4 w-4" /></Button>
    </div>}
    {recording ? <div role="status" className="flex items-center gap-2 p-2 text-destructive"><Mic className="h-4 w-4 motion-safe:animate-pulse" />Enregistrement · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</div> : <Textarea aria-label="Message" value={text} disabled={posting || requesting} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }} placeholder={placeholder} rows={2} maxLength={5000} className="min-h-14 max-h-40 resize-none border-0 bg-transparent focus-visible:ring-0 text-sm" />}
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" title="Joindre une photo" aria-label="Joindre une photo" disabled={posting || recording || requesting} onClick={() => { if (input.current) { input.current.accept = "image/jpeg,image/png,image/webp,image/gif"; input.current.click(); } }}><ImagePlus className="h-5 w-5" /></Button>
      <Button type="button" variant="ghost" size="icon" title="Joindre une vidéo" aria-label="Joindre une vidéo" disabled={posting || recording || requesting} onClick={() => { if (input.current) { input.current.accept = "video/mp4,video/webm,video/quicktime"; input.current.click(); } }}><Video className="h-5 w-5" /></Button>
      <Button type="button" variant={recording ? "destructive" : "ghost"} size="icon" title={recording ? "Terminer le vocal" : "Enregistrer un vocal"} aria-label={recording ? "Terminer le vocal" : "Enregistrer un vocal"} disabled={posting || requesting || !!file} onClick={() => recording ? recorder.current?.stop() : void startRecording()}>{requesting ? <Loader2 className="h-5 w-5 animate-spin" /> : recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</Button>
      <Button type="submit" size="icon" title="Envoyer" aria-label="Envoyer" disabled={posting || recording || requesting || (!text.trim() && !file)} className="ml-auto shrink-0">{posting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</Button>
    </div>
  </form>;
}