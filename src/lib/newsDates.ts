export type NewsDateMode = "all" | "today" | "week" | "custom";

export interface NewsTimeRange {
  fromIso: string;
  toIso: string;
  fromDate: string;
  toDate: string;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfLocalDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function toUnixSeconds(value: string | Date) {
  return Math.floor(new Date(value).getTime() / 1000);
}

export function getDayRange(date: Date): NewsTimeRange {
  const start = startOfLocalDay(date);
  const end = endOfLocalDay(date);

  return {
    fromIso: start.toISOString(),
    toIso: end.toISOString(),
    fromDate: formatLocalDate(start),
    toDate: formatLocalDate(start),
  };
}

export function getWeekRange(date: Date): NewsTimeRange {
  const start = startOfLocalDay(date);
  const dayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOffset);

  const end = endOfLocalDay(start);
  end.setDate(start.getDate() + 6);

  return {
    fromIso: start.toISOString(),
    toIso: end.toISOString(),
    fromDate: formatLocalDate(start),
    toDate: formatLocalDate(end),
  };
}

export function getActiveNewsRange(mode: NewsDateMode, customDate?: Date): NewsTimeRange | null {
  if (mode === "today") return getDayRange(new Date());
  if (mode === "week") return getWeekRange(new Date());
  if (mode === "custom" && customDate) return getDayRange(customDate);
  return null;
}

export function getDefaultNewsRange(): NewsTimeRange {
  const start = startOfLocalDay(new Date());
  start.setDate(start.getDate() - 14);

  const end = endOfLocalDay(new Date());
  end.setDate(end.getDate() + 45);

  return {
    fromIso: start.toISOString(),
    toIso: end.toISOString(),
    fromDate: formatLocalDate(start),
    toDate: formatLocalDate(end),
  };
}

export function sortEconomicNews<T extends { event_at: string; impact: "high" | "medium" | "low" }>(rows: T[]) {
  const impactWeight = { high: 3, medium: 2, low: 1 } as const;

  return rows.slice().sort((a, b) => {
    const byTime = toUnixSeconds(b.event_at) - toUnixSeconds(a.event_at);
    if (byTime !== 0) return byTime;
    return impactWeight[b.impact] - impactWeight[a.impact];
  });
}
