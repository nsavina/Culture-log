import type { EntryType } from "@/lib/types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

/** Search TMDB for movie/series poster (free, no API key needed for search) */
async function fetchTmdbPoster(title: string, type: "movie" | "series"): Promise<string | null> {
  const mediaType = type === "series" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/search/${mediaType}?query=${encodeURIComponent(title)}&language=en-US&page=1`;

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const posterPath = data.results?.[0]?.poster_path;
    if (!posterPath) return null;

    return `${TMDB_IMAGE_BASE}${posterPath}`;
  } catch {
    return null;
  }
}

/** Search Google Books for book cover (free, no API key needed) */
async function fetchBookCover(title: string, author?: string): Promise<string | null> {
  const query = author ? `${title} ${author}` : title;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const imageLinks = data.items?.[0]?.volumeInfo?.imageLinks;
    if (!imageLinks) return null;

    // Prefer larger image, replace http with https
    const coverUrl = (imageLinks.thumbnail ?? imageLinks.smallThumbnail) as string;
    return coverUrl?.replace("http://", "https://") ?? null;
  } catch {
    return null;
  }
}

/** Search Unsplash for a food/place photo (free, 50 req/hour) */
async function fetchUnsplashPhoto(query: string): Promise<string | null> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) return null;

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${apiKey}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    return data.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

/** Fetch a cover image URL based on entry type */
export async function fetchCoverUrl(
  title: string,
  type: EntryType,
  enrichment?: Record<string, unknown>
): Promise<string | null> {
  switch (type) {
    case "movie":
    case "series":
      return fetchTmdbPoster(title, type);
    case "book":
      return fetchBookCover(title, enrichment?.author as string | undefined);
    case "cafe": {
      const query = enrichment?.cuisine ? `${enrichment.cuisine} cafe` : `${title} cafe`;
      return fetchUnsplashPhoto(query);
    }
    case "restaurant_dish": {
      const query = enrichment?.cuisine ? `${title} ${enrichment.cuisine} food` : `${title} dish food`;
      return fetchUnsplashPhoto(query);
    }
  }
}
