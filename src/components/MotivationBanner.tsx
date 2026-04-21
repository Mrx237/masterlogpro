import { Sparkles } from "lucide-react";

export function MotivationBanner({
  text = "« Les meilleurs traders sont ceux qui analysent leurs erreurs. »",
  tone = "cyan",
}: { text?: string; tone?: "cyan" | "gold" }) {
  const accent = tone === "gold" ? "text-student" : "text-primary";
  const glow = tone === "gold" ? "from-student/15" : "from-primary/15";
  return (
    <div className={`relative overflow-hidden rounded-xl glass px-5 py-4 flex items-center gap-3`}>
      <div className={`absolute inset-0 bg-gradient-to-r ${glow} via-transparent to-transparent pointer-events-none`} />
      <Sparkles className={`h-4 w-4 shrink-0 ${accent}`} />
      <p className="text-sm font-medium italic text-foreground/90 leading-snug">{text}</p>
    </div>
  );
}
