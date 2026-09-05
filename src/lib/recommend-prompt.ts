import type { Entry } from "@/lib/types";

/** Prompt builders for the AI recommendation endpoint (pure, unit-testable) */

export function buildSystemPrompt(): string {
  return `You are a personal recommendation engine for a culture tracker app.
The user tracks movies, series, books, cafes, and restaurant dishes.

You will receive two inputs:
1. USER REQUEST — the user's current context, mood, location, and what they're looking for right now.
2. FEED DATA — the user's existing entries with ratings, genres, and preferences. This represents their established taste profile.

Your job is to combine BOTH: recommend items that match the user's request AND align with their demonstrated taste from the feed. The request sets the direction, the feed ensures the recommendations feel personal.

Return ONLY valid JSON in this exact format:
{
  "movie": [{"title": "...", "reason": "...", "year": 2020, "director": "...", "genre": ["..."]}],
  "series": [{"title": "...", "reason": "...", "year": 2020, "genre": ["..."]}],
  "book": [{"title": "...", "reason": "...", "author": "...", "genre": ["..."]}],
  "cafe": [{"title": "...", "reason": "...", "cuisine": "...", "location": "..."}],
  "restaurant_dish": [{"title": "...", "reason": "...", "cuisine": "..."}]
}

Rules:
- Provide exactly 3 items per category.
- Each "reason" MUST reference both the user's request AND a specific pattern/item from their feed (e.g. "Since you loved X and are looking for Y, try Z").
- If the user mentions a city or location, recommend cafes and dishes IN that city.
- Do NOT recommend items the user has already logged (listed in EXPERIENCED or WISHLIST sections).
- Be specific and personal, not generic "top 10" lists.
- All fields except "title" and "reason" are optional but preferred.`;
}

export function buildUserMessage(
  entries: Entry[],
  userPrompt: string | null
): string {
  const lines: string[] = [];

  // User's personal request
  if (userPrompt) {
    lines.push("USER REQUEST:");
    lines.push(userPrompt);
    lines.push("");
  }

  // Experienced entries with ratings
  const experienced = entries.filter((e) => e.status === "experienced");
  const wishlist = entries.filter((e) => e.status === "wishlist");

  if (experienced.length > 0) {
    lines.push("EXPERIENCED ENTRIES (rated):");
    for (const e of experienced) {
      const enrichment = e.enrichment as Record<string, unknown> | null;
      const parts = [`- ${e.type}: "${e.title}"`];
      if (e.rating) parts.push(`(${e.rating}/10)`);
      if (enrichment?.genre) parts.push(`genres: ${(enrichment.genre as string[]).join(", ")}`);
      if (enrichment?.director) parts.push(`director: ${enrichment.director}`);
      if (enrichment?.author) parts.push(`author: ${enrichment.author}`);
      if (enrichment?.cuisine) parts.push(`cuisine: ${enrichment.cuisine}`);
      lines.push(parts.join(", "));
    }
    lines.push("");
  }

  if (wishlist.length > 0) {
    lines.push("WISHLIST (interested but not experienced yet):");
    for (const e of wishlist) {
      lines.push(`- ${e.type}: "${e.title}"`);
    }
    lines.push("");
  }

  // Aggregate stats
  const ratingsByType: Record<string, number[]> = {};
  for (const e of experienced) {
    if (e.rating) {
      if (!ratingsByType[e.type]) ratingsByType[e.type] = [];
      ratingsByType[e.type].push(e.rating);
    }
  }

  const avgRatings = Object.entries(ratingsByType).map(([type, ratings]) => {
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    return `${type}: ${avg.toFixed(1)}`;
  });

  if (avgRatings.length > 0) {
    lines.push(`Average ratings by type: ${avgRatings.join(", ")}`);
  }

  // Genre frequency
  const genreCounts: Record<string, number> = {};
  for (const e of experienced) {
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
    .slice(0, 8)
    .map(([g, c]) => `${g} (${c})`);

  if (topGenres.length > 0) {
    lines.push(`Top genres: ${topGenres.join(", ")}`);
  }

  lines.push("");
  lines.push("Generate recommendations for all 5 categories: movie, series, book, cafe, restaurant_dish.");
  lines.push("Each recommendation must be informed by BOTH the user's request above AND their taste patterns from the feed data.");

  return lines.join("\n");
}
