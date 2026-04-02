import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGroqClient } from "@/lib/groq";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groq = getGroqClient();
  if (!groq) {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }

  const body = await request.json();
  const { url } = body as { url: string };

  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You analyze URLs and determine what cultural item they refer to.

Return ONLY valid JSON with these fields:
- "title": string (the name of the movie, series, book, cafe, or dish)
- "type": string (one of: "movie", "series", "book", "cafe", "restaurant_dish")

Common URL patterns:
- imdb.com → movie or series
- goodreads.com → book
- google.com/maps, maps.google.com, goo.gl/maps → cafe or restaurant_dish
- letterboxd.com → movie
- myshows.me, themoviedb.org → movie or series
- tripadvisor.com → cafe or restaurant_dish
- yelp.com → cafe or restaurant_dish

Extract the title from the URL path, query params, or slug. Clean it up (remove dashes, IDs, etc.).
If you cannot determine the title or type, return {"title": null, "type": null}.`,
        },
        {
          role: "user",
          content: `What is this URL about? ${url}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ title: null, type: null });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({
      title: parsed.title ?? null,
      type: parsed.type ?? null,
    });
  } catch (err) {
    console.error("Parse link failed:", err);
    return NextResponse.json({ title: null, type: null });
  }
}
