import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getGroqClient } from "@/lib/groq";
import { checkRateLimit } from "@/lib/rate-limit";
import { recommendRequestSchema } from "@/lib/validation";
import { buildSystemPrompt, buildUserMessage } from "@/lib/recommend-prompt";
import type { EntryType, Entry, RecommendationItem } from "@/lib/types";

const ENTRY_TYPES: EntryType[] = ["movie", "series", "book", "cafe", "restaurant_dish"];
const MIN_ENTRIES_FOR_RECS = 3;
const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

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

  const rateLimit = checkRateLimit(`recommend:${user.id}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests, slow down" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json(
      { error: "AI unavailable — GROQ_API_KEY not configured" },
      { status: 503 }
    );
  }

  // Parse optional body: { entryType?, exclude? }
  // No body / invalid JSON — generate all categories
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // keep defaults
  }

  const parsedBody = recommendRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: z.flattenError(parsedBody.error).fieldErrors },
      { status: 400 }
    );
  }
  const entryType: EntryType | null = parsedBody.data.entryType ?? null;
  const exclude: string[] = parsedBody.data.exclude ?? [];

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
