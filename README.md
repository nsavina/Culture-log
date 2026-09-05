# Culture Log

A personal culture tracker: log movies, series, books, cafes, and restaurant dishes you've experienced or want to try — with ratings, impressions, and AI-powered enrichment and recommendations.

## Features

- **Entries** — track five types of cultural items (movie, series, book, cafe, dish) with two statuses: *wishlist* and *experienced*, plus a 1–10 rating and free-form impressions.
- **AI enrichment** — after saving an entry, an LLM (Groq, llama-3.3-70b) fills in metadata: director, author, genres, year, description, IMDB rating, address, price range.
- **Personal recommendations** — an AI recommendation engine combines your rated feed (taste profile, top genres, average ratings) with a free-form prompt ("I'm in Lisbon and want something cozy") to suggest 3 items per category.
- **Link parsing** — paste an IMDB / Goodreads / Google Maps link and the app detects the title and entry type automatically.
- **Covers** — posters and covers fetched from TMDB, Google Books, and Unsplash.
- **Auth & privacy** — Supabase Auth with Row Level Security: every user sees only their own data.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, React Server Components) + React 19, TypeScript strict mode
- [Supabase](https://supabase.com) — Postgres, Auth, RLS, versioned migrations
- [Groq](https://groq.com) (llama-3.3-70b) for enrichment, recommendations, and link parsing
- Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com), Lucide icons
- [Zod](https://zod.dev) for API request validation, [Vitest](https://vitest.dev) for unit tests
- Deployed on [Vercel](https://vercel.com)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local`:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# AI features (required for enrichment / recommendations / link parsing)
GROQ_API_KEY=<groq-api-key>

# Covers (optional — features degrade gracefully without them)
TMDB_API_KEY=<tmdb-v4-read-token>
UNSPLASH_ACCESS_KEY=<unsplash-access-key>
```

The app degrades gracefully: without Supabase vars, database features are disabled; without AI keys, AI endpoints return 503.

### 3. Set up the database

Apply migrations from `supabase/migrations/` to your Supabase project:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
  app/
    (auth)/          # login, OAuth callback
    (app)/           # feed, entry create/detail, profile
    api/ai/          # enrich, recommend, parse-link (Zod-validated)
  components/        # feature components + shadcn/ui primitives
  lib/
    supabase/        # server / client / middleware helpers
    covers.ts        # TMDB / Google Books / Unsplash cover lookup
    types.ts         # domain model
supabase/migrations/ # versioned SQL schema (tables, RLS, triggers, indexes)
```

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/ai/enrich` | POST | Enrich an entry with metadata via LLM, fetch a cover |
| `/api/ai/recommend` | POST | Generate personal recommendations from the user's feed |
| `/api/ai/parse-link` | POST | Detect title and entry type from a pasted URL |

All routes require an authenticated Supabase session, validate request bodies with Zod, and are rate-limited per user (in-memory sliding window; 429 with `Retry-After` when exceeded).

## Testing

```bash
npm test
```

Unit tests (Vitest) cover the request validation schemas, the rate limiter, and the recommendation prompt builder.
