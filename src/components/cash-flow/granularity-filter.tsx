"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Granularity } from "@/actions/cash-flow";

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: "daily", label: "일별" },
  { value: "weekly", label: "주별" },
  { value: "monthly", label: "월별" },
  { value: "quarterly", label: "분기별" },
];

export function GranularityFilter({ current }: { current: Granularity }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = useCallback(
    (gran: Granularity) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("gran", gran);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex rounded-md border overflow-hidden text-sm">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => set(o.value)}
          className={`px-3 py-1.5 transition-colors ${
            current === o.value
              ? "bg-primary text-primary-foreground font-medium"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PeriodFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setDate = useCallback(
    (key: "from" | "to", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        type="date"
        value={from}
        onChange={(e) => setDate("from", e.target.value)}
        className="rounded-md border px-2 py-1.5 text-sm bg-background"
      />
      <span className="text-muted-foreground">~</span>
      <input
        type="date"
        value={to}
        onChange={(e) => setDate("to", e.target.value)}
        className="rounded-md border px-2 py-1.5 text-sm bg-background"
      />
    </div>
  );
}
