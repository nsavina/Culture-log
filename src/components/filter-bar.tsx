"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { EntryType, EntryStatus } from "@/lib/types";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_TYPES: EntryType[] = ["movie", "series", "book", "cafe", "restaurant_dish"];

const STATUS_OPTIONS: { value: EntryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "wishlist", label: "Wishlist" },
  { value: "experienced", label: "Experienced" },
];

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = (searchParams.get("status") ?? "all") as EntryStatus | "all";
  const currentType = searchParams.get("type") ?? "all";

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/feed?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b pb-4">
      {STATUS_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => updateParams("status", value)}
          className={cn(
            "text-xs uppercase tracking-[0.12em] font-medium transition-colors",
            currentStatus === value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}

      <span className="text-muted-foreground/30">|</span>

      {ALL_TYPES.map((t) => (
        <button
          key={t}
          onClick={() => updateParams("type", currentType === t ? "all" : t)}
          className={cn(
            "text-xs uppercase tracking-[0.12em] font-medium transition-colors",
            currentType === t
              ? ENTRY_TYPE_COLORS[t]
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {ENTRY_TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  );
}
