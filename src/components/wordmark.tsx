import { cn } from "@/lib/utils";

/** taplino. wordmark with the "admin" tag, so staff always know which surface they are on. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="display text-2xl tracking-tight text-ink">
        taplino<span className="text-accent">.</span>
      </span>
      <span className="eyebrow rounded-full bg-ink px-2 py-0.5 text-[0.62rem] text-paper">admin</span>
    </span>
  );
}
