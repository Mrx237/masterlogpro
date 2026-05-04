import { useEffect, useState } from "react";
import { getPromoInfo, formatFCFA, type OfferKey } from "@/lib/constants";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

function diff(deadline: Date) {
  const ms = Math.max(0, deadline.getTime() - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { d, h, m, s, expired: ms === 0 };
}

export function PromoBadge({
  offerKey,
  tone = "cyan",
  className,
}: {
  offerKey: OfferKey;
  tone?: "cyan" | "gold";
  className?: string;
}) {
  const info = getPromoInfo(offerKey);
  const [t, setT] = useState(() => diff(info.deadline));

  useEffect(() => {
    if (!info.active) return;
    const id = setInterval(() => setT(diff(info.deadline)), 1000);
    return () => clearInterval(id);
  }, [info.active, info.deadline]);

  if (!info.active) return null;

  const isGold = tone === "gold";
  const ring = isGold ? "border-student/40 bg-student/10 text-student" : "border-subscriber/40 bg-subscriber/10 text-subscriber";
  const dot = isGold ? "bg-student" : "bg-subscriber";

  return (
    <div className={cn("rounded-xl border px-3 py-2 flex items-center gap-3 text-xs", ring, className)}>
      <div className="flex items-center gap-1.5 font-mono uppercase tracking-[0.15em] text-[10px] font-bold whitespace-nowrap">
        <Flame className="h-3 w-3" />
        Promo lancement
      </div>
      <div className={cn("h-1 w-1 rounded-full animate-pulse", dot)} />
      <div className="flex items-center gap-1 font-mono tabular-nums whitespace-nowrap">
        <Cell n={t.d} l="j" />
        <span className="opacity-50">:</span>
        <Cell n={t.h} l="h" />
        <span className="opacity-50">:</span>
        <Cell n={t.m} l="m" />
        <span className="opacity-50">:</span>
        <Cell n={t.s} l="s" />
      </div>
      <div className="ml-auto text-[10px] opacity-70 line-through hidden sm:block">
        {formatFCFA(info.regularPrice).replace(" FCFA", "")}
      </div>
    </div>
  );
}

function Cell({ n, l }: { n: number; l: string }) {
  return (
    <span className="font-bold">
      {String(n).padStart(2, "0")}
      <span className="opacity-60 text-[9px] ml-0.5">{l}</span>
    </span>
  );
}
