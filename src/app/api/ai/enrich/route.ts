import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGroqClient } from "@/lib/groq";
import { fetchCoverUrl } from "@/lib/covers";
import type { EntryType } from "@/lib/types";

function getSystemPrompt(type: EntryType): string {
  const base = "You are a cultural knowledge assistant. Return ONLY valid JSON. If you don't know a value, omit the field. Do not invent data.";

  switch (type) {
    case "movie":
    case "series":
      return `${base}
Return JSON with these optional fields:
- "director": string (director name)
- "year": number (release year)
- "genre": string[] (genres)
- "description": string (1-2 sentence plot summary, no spoilers)
- "imdb_url": string (IMDB URL if known)
- "imdb_rating": number (IMDB rating if known, e.g. 8.1)`;

    case "book":
      return `${base}
Return JSON with these optional fields:
- "author": string (author name)
- "year": number (publication year)
- "genre": string[] (genres)
- "description": string (1-2 sentence summary, no spoilers)
- "pages": number (page count)`;

    case "cafe":
    case "restaurant_dish":
      return `${base}
Return JSON with these fields:
- "cuisine": string (cuisine type)
- "description": string (1-2 sentence description)
- "price_range": string (e.g. "$", "$$", "$$$")
- "address": string (IMPORTANT: always try to provide a full street address including city and country)
- "google_maps_url": string (Google Maps URL if known)`;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    console.error("Enrich auth error:", authError?.message ?? "No user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: "AI unavailable — GROQ_API_KEY not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { entryId, title, type, link, impression } = body as {
    entryId: string;
    title: string;
    type: EntryType;
    link?: string;
    impression?: string;
  };

  if (!entryId || !title || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    let userMessage = `Tell me about: "${title}" (${type})`;
    if (link) userMessage += `. Link: ${link}`;
    if (impression) userMessage += `\nUser's note: ${impression}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: getSystemPrompt(type) },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }

    const enrichment = JSON.parse(content);

    // Fetch real cover image from TMDB / Google Books / Unsplash
    const coverUrl = await fetchCoverUrl(title, type, enrichment);
    if (coverUrl) {
      if (type === "movie" || type === "series") {
        enrichment.poster_url = coverUrl;
      } else if (type === "book") {
        enrichment.cover_url = coverUrl;
      } else {
        enrichment.photo_url = coverUrl;
      }
    }

    const { error } = await supabase
      .from("entries")
      .update({ enrichment })
      .eq("id", entryId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to save enrichment" }, { status: 500 });
    }

    return NextResponse.json({ enrichment });
  } catch (err) {
    console.error("Enrichment failed:", err);
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 });
  }
}
