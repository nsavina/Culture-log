"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "@/components/recommendation-card";
import type { EntryType, Recommendation, RecommendationItem } from "@/lib/types";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS } from "@/lib/types";
import { Loader2, RefreshCw, Sparkles, ChevronDown } from "lucide-react";

interface RecommendationsSectionProps {
  initialRecommendations: Recommendation[];
  experiencedCount: number;
  /** Map of "type:lowercased_title" → entry id for recommendations already added */
  addedEntries: Record<string, string>;
}

const MIN_ENTRIES = 3;

export function RecommendationsSection({
  initialRecommendations,
  experiencedCount,
  addedEntries,
}: RecommendationsSectionProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState<EntryType | null>(null);
  const hasEnough = experiencedCount >= MIN_ENTRIES;
  const hasRecs = recommendations.length > 0;

  async function generateRecommendations() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to generate recommendations");
        return;
      }

      toast.success("Recommendations generated!");
      router.refresh();
    } catch {
      toast.error("Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore(entryType: EntryType, existingTitles: string[]) {
    setLoadingMore(entryType);
    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType,
          exclude: existingTitles,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to load more");
        return;
      }

      const data = await res.json();
      const newItems: RecommendationItem[] = data.recommendations?.[entryType] ?? [];

      if (newItems.length > 0) {
        // Update local state — append new items to the matching category
        setRecommendations((prev) =>
          prev.map((rec) =>
            rec.entry_type === entryType
              ? { ...rec, items: [...rec.items, ...newItems] }
              : rec
          )
        );
      }
    } catch {
      toast.error("Failed to load more");
    } finally {
      setLoadingMore(null);
    }
  }

  // Not enough entries
  if (!hasEnough) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/50" />
        <p className="max-w-xs text-sm text-muted-foreground">
          Log at least {MIN_ENTRIES} experienced entries to get personalized
          AI recommendations. You have {experiencedCount} so far.
        </p>
      </div>
    );
  }

  // No recommendations yet — show generate button
  if (!hasRecs) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/50" />
        <p className="max-w-xs text-sm text-muted-foreground">
          Ready to get personalized recommendations based on your{" "}
          {experiencedCount} entries?
        </p>
        <Button onClick={generateRecommendations} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Recommendations
        </Button>
      </div>
    );
  }

  // Show recommendations grouped by type
  const generatedAt = recommendations[0]?.generated_at;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        {generatedAt && (
          <p className="text-xs text-muted-foreground">
            Generated{" "}
            {new Date(generatedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={generateRecommendations}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {recommendations.map((rec) => {
        const type = rec.entry_type as EntryType;
        const isLoadingThis = loadingMore === type;
        const titles = rec.items.map((item) => item.title);

        return (
          <div key={rec.id} className="flex flex-col gap-2">
            <h3
              className={`text-xs font-medium uppercase tracking-[0.15em] ${ENTRY_TYPE_COLORS[type]}`}
            >
              {ENTRY_TYPE_LABELS[type]}
            </h3>
            <div className="flex flex-col gap-2">
              {rec.items.map((item) => {
                const key = `${rec.entry_type}:${item.title.toLowerCase()}`;
                const addedEntryId = addedEntries[key] ?? null;
                return (
                  <RecommendationCard
                    key={item.title}
                    item={item}
                    entryType={type}
                    addedEntryId={addedEntryId}
                  />
                );
              })}
            </div>
            <button
              onClick={() => loadMore(type, titles)}
              disabled={isLoadingThis || loading}
              className="flex items-center gap-1.5 self-start text-[11px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {isLoadingThis ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              More {ENTRY_TYPE_LABELS[type].toLowerCase()}s
            </button>
          </div>
        );
      })}
    </div>
  );
}
