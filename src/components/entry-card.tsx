import Link from "next/link";
import { Star } from "lucide-react";
import type { Entry } from "@/lib/types";
import {
  ENTRY_TYPE_LABELS,
  ENTRY_TYPE_COLORS,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function EntryCard({ entry }: { entry: Entry }) {
  const e = entry.enrichment as Record<string, unknown> | null;
  const imageUrl = entry.cover_url ?? (e?.poster_url ?? e?.cover_url ?? e?.photo_url) as string | undefined;
  const subtitle = e
    ? [e.director ?? e.author, e.year].filter(Boolean).join(", ")
    : null;

  return (
    <Link href={`/entry/${entry.id}`} className="group block">
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted mb-2">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={entry.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className={cn("text-2xl font-bold uppercase", ENTRY_TYPE_COLORS[entry.type])}>
              {ENTRY_TYPE_LABELS[entry.type]}
            </span>
          </div>
        )}
        {/* Rating badge */}
        {entry.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-background/90 px-1.5 py-0.5 text-xs font-medium">
            <Star className="h-3 w-3 fill-current" />
            {entry.rating}
          </div>
        )}
        {/* Status badge */}
        {entry.status === "wishlist" && (
          <div className="absolute top-2 left-2 bg-foreground text-background px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-medium">
            Wishlist
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="font-semibold leading-tight text-sm">{entry.title}</h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
      <div className="flex items-center gap-2 mt-1">
        <span className={cn("text-[10px] uppercase tracking-wider", ENTRY_TYPE_COLORS[entry.type])}>
          {ENTRY_TYPE_LABELS[entry.type]}
        </span>
      </div>
    </Link>
  );
}
