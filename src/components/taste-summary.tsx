import type { Entry, EntryType } from "@/lib/types";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS } from "@/lib/types";

interface TasteSummaryProps {
  entries: Entry[];
}

export function TasteSummary({ entries }: TasteSummaryProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No entries yet. Start logging to see your taste profile here.
      </p>
    );
  }

  const experienced = entries.filter((e) => e.status === "experienced");

  // Count by type
  const countByType: Partial<Record<EntryType, number>> = {};
  for (const e of entries) {
    countByType[e.type] = (countByType[e.type] || 0) + 1;
  }

  // Average rating by type
  const ratingsByType: Partial<Record<EntryType, number[]>> = {};
  for (const e of experienced) {
    if (e.rating) {
      if (!ratingsByType[e.type]) ratingsByType[e.type] = [];
      ratingsByType[e.type]!.push(e.rating);
    }
  }

  // Top genres from enrichment
  const genreCounts: Record<string, number> = {};
  for (const e of entries) {
    const enrichment = e.enrichment as Record<string, unknown> | null;
    const genres = enrichment?.genre as string[] | undefined;
    if (genres) {
      for (const g of genres) {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      }
    }
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Highest rated
  const topRated = experienced
    .filter((e) => e.rating && e.rating >= 8)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Entry counts by type */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(countByType) as [EntryType, number][]).map(
          ([type, count]) => (
            <div key={type} className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold">{count}</span>
              <span
                className={`text-xs uppercase tracking-wide ${ENTRY_TYPE_COLORS[type]}`}
              >
                {ENTRY_TYPE_LABELS[type]}
                {count !== 1 ? "s" : ""}
              </span>
            </div>
          )
        )}
      </div>

      {/* Average ratings */}
      {Object.keys(ratingsByType).length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Average ratings
          </p>
          <div className="flex flex-wrap gap-3">
            {(
              Object.entries(ratingsByType) as [EntryType, number[]][]
            ).map(([type, ratings]) => {
              const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
              return (
                <div key={type} className="flex items-baseline gap-1">
                  <span className={`text-xs ${ENTRY_TYPE_COLORS[type]}`}>
                    {ENTRY_TYPE_LABELS[type]}
                  </span>
                  <span className="text-sm font-medium">{avg.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top genres */}
      {topGenres.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Top genres
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topGenres.map(([genre, count]) => (
              <span
                key={genre}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {genre} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Highest rated */}
      {topRated.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Favorites
          </p>
          <div className="flex flex-col gap-0.5">
            {topRated.map((e) => (
              <div key={e.id} className="flex items-baseline gap-2 text-sm">
                <span className="font-medium">{e.title}</span>
                <span className="text-muted-foreground">
                  {e.rating}/10
                </span>
                <span
                  className={`text-[10px] uppercase ${ENTRY_TYPE_COLORS[e.type]}`}
                >
                  {ENTRY_TYPE_LABELS[e.type]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
