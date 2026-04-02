export type EntryType = "movie" | "series" | "book" | "cafe" | "restaurant_dish";
export type EntryStatus = "wishlist" | "experienced";

export interface Entry {
  id: string;
  user_id: string;
  type: EntryType;
  status: EntryStatus;
  title: string;
  link: string | null;
  rating: number | null;
  impression: string | null;
  audio_path: string | null;
  recommended_by: string | null;
  recommendation_context: string | null;
  enrichment: Enrichment | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  birth_year: number | null;
  gender: Gender | null;
  prompt: string | null;
  taste_profile_json: Record<string, unknown> | null;
  taste_profile_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationItem {
  title: string;
  reason: string;
  year?: number;
  director?: string;
  author?: string;
  genre?: string[];
  cuisine?: string;
  location?: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  entry_type: EntryType;
  items: RecommendationItem[];
  generated_at: string;
}

/** AI enrichment data — shape varies by entry type */
export interface MovieEnrichment {
  director?: string;
  year?: number;
  genre?: string[];
  description?: string;
  imdb_url?: string;
  imdb_rating?: number;
  poster_url?: string;
}

export interface BookEnrichment {
  author?: string;
  year?: number;
  genre?: string[];
  description?: string;
  pages?: number;
  cover_url?: string;
}

export interface PlaceEnrichment {
  cuisine?: string;
  description?: string;
  price_range?: string;
  address?: string;
  google_maps_url?: string;
}

export type Enrichment = MovieEnrichment | BookEnrichment | PlaceEnrichment;

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  movie: "Movie",
  series: "Series",
  book: "Book",
  cafe: "Cafe",
  restaurant_dish: "Dish",
};

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  wishlist: "Wishlist",
  experienced: "Experienced",
};

/** Calm, muted colors for each entry type */
export const ENTRY_TYPE_COLORS: Record<EntryType, string> = {
  movie: "text-blue-500",
  series: "text-violet-500",
  book: "text-emerald-600",
  cafe: "text-amber-600",
  restaurant_dish: "text-rose-500",
};

/** Left border accent for cards */
export const ENTRY_TYPE_BORDER_COLORS: Record<EntryType, string> = {
  movie: "border-l-blue-400",
  series: "border-l-violet-400",
  book: "border-l-emerald-400",
  cafe: "border-l-amber-400",
  restaurant_dish: "border-l-rose-400",
};
