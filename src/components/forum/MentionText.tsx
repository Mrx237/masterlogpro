export function MentionText({ text }: { text: string }) {
  if (!text) return null;
  return <>{text.split(/(@[a-z0-9_]{3,30})/gi).map((part, i) =>
    /^@[a-z0-9_]{3,30}$/i.test(part)
      ? <span key={i} className="font-semibold text-primary">{part}</span>
      : part)}</>;
}
