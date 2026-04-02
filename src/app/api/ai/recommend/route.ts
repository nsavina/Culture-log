import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGroqClient } from "@/lib/groq";
import type { EntryType, Entry, RecommendationItem } from "@/lib/types";

const ENTRY_TYPES: EntryType[] = ["movie", "series", "book", "cafe", "restaurant_dish"];
const MIN_ENTRIES_FOR_RECS = 3;

function buildSystemPrompt(): string {
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

function buildUserMessage(
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

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("Recommend auth error:", authError?.message ?? "No user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      { error: "AI unavailable — GROQ_API_KEY not configured" },
      { status: 503 }
    );
  }

  // Parse optional body: { entryType?, exclude? }
  let entryType: EntryType | null = null;
  let exclude: string[] = [];
  try {
    const body = await request.json();
    if (body.entryType && ENTRY_TYPES.includes(body.entryType)) {
      entryType = body.entryType;
    }
    if (Array.isArray(body.exclude)) {
      exclude = body.exclude;
    }
  } catch {
    // No body or invalid JSON — generate all categories
  }

  // Fetch user entries
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (entriesError) {
    console.error("Failed to fetch entries:", entriesError.message);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }

  const experiencedCount = (entries ?? []).filter((e) => e.status === "experienced").length;
  if (experiencedCount < MIN_ENTRIES_FOR_RECS) {
    return NextResponse.json(
      {
        error: `Need at least ${MIN_ENTRIES_FOR_RECS} experienced entries to generate recommendations. You have ${experiencedCount}.`,
      },
      { status: 422 }
    );
  }

  // Fetch user profile for context
  const { data: profile } = await supabase
    .from("profiles")
    .select("prompt")
    .eq("id", user.id)
    .single();

  const isLoadMore = !!entryType;
  const categoriesToGenerate = entryType ? [entryType] : ENTRY_TYPES;

  // Build extra instruction for load more
  let userMessage = buildUserMessage(entries as Entry[], profile?.prompt ?? null);
  if (isLoadMore) {
    userMessage += `\n\nGenerate recommendations ONLY for category: ${entryType}`;
    if (exclude.length > 0) {
      userMessage += `\nDo NOT recommend these (already shown): ${exclude.join(", ")}`;
    }
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: isLoadMore ? 500 : 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }

    const parsed = JSON.parse(content) as Record<string, RecommendationItem[]>;

    if (isLoadMore && entryType) {
      // Append to existing recommendations for this type
      const newItems = parsed[entryType] ?? [];
      if (newItems.length > 0) {
        // Fetch existing rec row for this type
        const { data: existing } = await supabase
          .from("recommendations")
          .select("id, items")
          .eq("user_id", user.id)
          .eq("entry_type", entryType)
          .single();

        if (existing) {
          const merged = [...(existing.items as RecommendationItem[]), ...newItems];
          await supabase
            .from("recommendations")
            .update({ items: merged })
            .eq("id", existing.id);
        } else {
          await supabase.from("recommendations").insert({
            user_id: user.id,
            entry_type: entryType,
            items: newItems,
            generated_at: new Date().toISOString(),
          });
        }
      }

      return NextResponse.json({ recommendations: parsed, loaded_more: true });
    }

    // Full generation — replace all
    await supabase.from("recommendations").delete().eq("user_id", user.id);

    const now = new Date().toISOString();
    const rows = categoriesToGenerate
      .filter((t) => parsed[t] && parsed[t].length > 0)
      .map((t) => ({
        user_id: user.id,
        entry_type: t,
        items: parsed[t],
        generated_at: now,
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("recommendations").insert(rows);
      if (insertError) {
        console.error("Failed to save recommendations:", insertError.message);
        return NextResponse.json({ error: "Failed to save recommendations" }, { status: 500 });
      }
    }

    return NextResponse.json({ recommendations: parsed, generated_at: now });
  } catch (err) {
    console.error("Recommendation generation failed:", err);
    return NextResponse.json({ error: "Recommendation generation failed" }, { status: 500 });
  }
}
