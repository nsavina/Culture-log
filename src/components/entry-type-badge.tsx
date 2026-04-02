import type { EntryType } from "@/lib/types";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EntryTypeBadge({ type }: { type: EntryType }) {
  return (
    <span className={cn("text-[11px] uppercase tracking-wider", ENTRY_TYPE_COLORS[type])}>
      {ENTRY_TYPE_LABELS[type]}
    </span>
  );
}
