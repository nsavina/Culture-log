import type { EntryType, RecommendationItem } from "@/lib/types";
import { ENTRY_TYPE_BORDER_COLORS } from "@/lib/types";
import { ButtonLink } from "@/components/button-link";
import { Check, Plus } from "lucide-react";

interface RecommendationCardProps {
  item: RecommendationItem;
  entryType: EntryType;
  /** If set, this recommendation has been added as an entry with this id */
  addedEntryId: string | null;
}

export function RecommendationCard({
  item,
  entryType,
  addedEntryId,
}: RecommendationCardProps) {
  const wishlistUrl = `/entry/new?title=${encodeURIComponent(item.title)}&type=${entryType}`;

  // Build metadata line
  const meta: string[] = [];
  if (item.year) meta.push(String(item.year));
  if (item.director) meta.push(item.director);
  if (item.author) meta.push(item.author);
  if (item.cuisine) meta.push(item.cuisine);
  if (item.location) meta.push(item.location);

  const isAdded = !!addedEntryId;

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border-l-2 p-3 ${ENTRY_TYPE_BORDER_COLORS[entryType]} ${isAdded ? "bg-muted/50 opacity-75" : "bg-card"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium leading-snug">{item.title}</span>
          {meta.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {meta.join(" · ")}
            </span>
          )}
        </div>
        {isAdded ? (
          <ButtonLink
            href={`/entry/${addedEntryId}`}
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 p-0 text-emerald-500"
          >
            <Check className="h-4 w-4" />
          </ButtonLink>
        ) : (
          <ButtonLink
            href={wishlistUrl}
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 p-0"
          >
            <Plus className="h-4 w-4" />
          </ButtonLink>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground italic">
        {item.reason}
      </p>

      {item.genre && item.genre.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.genre.map((g) => (
            <span
              key={g}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
