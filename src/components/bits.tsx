"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, Input } from "@/components/ui";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Search box that reports its value after the user pauses typing. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), 250);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="bg-white py-2.5 pl-10"
      />
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>
        {from} to {to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="rounded-full p-2 transition hover:bg-ink/5 disabled:opacity-30"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2 font-semibold text-ink">
          {page} / {pages}
        </span>
        <button
          className="rounded-full p-2 transition hover:bg-ink/5 disabled:opacity-30"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <p className="eyebrow text-muted">{label}</p>
      <p className="display mt-3 text-4xl text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function Avatar({
  name,
  url,
  size = "md",
}: {
  name: string;
  url?: string | null;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "size-8 text-xs" : "size-10 text-sm";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={cn(dims, "shrink-0 rounded-full object-cover")} />;
  }
  return (
    <span
      className={cn(
        dims,
        "flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-ink",
      )}
    >
      {initials(name)}
    </span>
  );
}

/** A company's brand colour as a small monogram tile. */
export function CompanyMark({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition",
            value === tab.value
              ? "border-accent text-ink"
              : "border-transparent text-muted hover:text-ink",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs tabular-nums text-muted">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Uniform table used across list screens. Scrolls sideways on narrow screens. */
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-paper/60">
            <tr>
              {head.map((h, i) => (
                <th key={i} className="px-5 py-3 text-xs font-semibold tracking-wide text-muted uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return <p className="rounded-2xl bg-negative/10 px-4 py-3 text-sm text-negative">{message}</p>;
}
