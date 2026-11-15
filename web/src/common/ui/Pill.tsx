import type { ReactNode } from "react";

// Reusable UI: no business logic, no data fetching.
export function Pill({ tone, children }: { tone: "ok" | "warn" | "muted"; children: ReactNode }) {
  const colors = {
    ok: "bg-emerald-100 text-emerald-900",
    warn: "bg-amber-100 text-amber-900",
    muted: "bg-zinc-100 text-zinc-700",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${colors[tone]}`}
    >
      {children}
    </span>
  );
}
