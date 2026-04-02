# Agent Instructions

## Tech Stack

- **Framework:** Next.js (App Router) with TypeScript
- **Database:** Supabase (PostgreSQL)
- **UI:** ShadcnUI components + Tailwind CSS v4
- **Icons:** Lucide React
- **Deployment:** Vercel

## Post-Change Commands

After implementing changes, you MUST tell the user if any of the following actions are required and provide the exact commands:

### 1. Restart the dev server

If you modified any of the following, tell the user to restart:

- `next.config.ts`
- `middleware.ts`
- `.env.local` or any environment variables
- `package.json` (new dependencies)
- `tailwind.config.ts` or `postcss.config.mjs`
- `tsconfig.json`

**Command:**
```bash
# Stop the running server (Ctrl+C), then:
npm run dev
```

### 2. Install new dependencies

If you added packages to `package.json`, tell the user:

**Command:**
```bash
npm install
```

### 3. Database migrations / schema changes

If you created or modified Supabase database schema (tables, RLS policies, functions, triggers), tell the user:

**Command (if using Supabase CLI):**
```bash
npx supabase db push
```

Or provide the exact SQL to run in the Supabase Dashboard SQL Editor.

### 4. Add new ShadcnUI components

If you reference a ShadcnUI component that hasn't been installed yet, tell the user:

**Command:**
```bash
npx shadcn@latest add <component-name>
```

### 5. Generate types from Supabase

If the database schema changed, tell the user to regenerate types:

**Command:**
```bash
npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/database.types.ts
```

## General Rules

- Always use the App Router (`src/app/`) — never Pages Router.
- Use Server Components by default; add `"use client"` only when needed.
- Place reusable components in `src/components/`.
- Place Supabase client utilities in `src/lib/supabase/`.
- Place other utilities in `src/lib/`.
- Use ShadcnUI components from `src/components/ui/` — do not create custom UI primitives when a ShadcnUI component exists.
- Use Lucide React for all icons.
- All Supabase clients must handle missing env vars gracefully (return null, don't throw).
