import Image from "next/image";
import mark from "@/components/assets/taplino-mark.svg";
import { cn } from "@/lib/utils";

/** Taplino mark and wordmark (same lockup as the marketing site) with the "admin" tag, so staff always know which surface they are on. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image src={mark} width={64} height={64} alt="" aria-hidden priority className="size-8" />
      <span className="font-[family-name:var(--font-bricolage)] text-2xl font-bold tracking-tight text-ink">
        Taplino
      </span>
      <span className="eyebrow rounded-full bg-ink px-2 py-0.5 text-[0.62rem] text-paper">admin</span>
    </span>
  );
}
