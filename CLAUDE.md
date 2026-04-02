@AGENTS.md

# Claude Code Instructions

## Project: Culture Log

A Next.js web application using Supabase, ShadcnUI, and Lucide icons, deployed on Vercel.

## Critical: Post-Implementation Checklist

After completing any implementation, you MUST check and inform the user about required follow-up actions. Provide exact commands to execute.

### Always check:

1. **Did you add new npm packages?**
   Tell user: `npm install`

2. **Did you modify config files (next.config.ts, middleware.ts, tsconfig.json, .env.local)?**
   Tell user: Restart the dev server with `npm run dev`

3. **Did you add/change database tables, columns, RLS policies, or functions?**
   Tell user: Push DB changes with `npx supabase db push`
   Or provide the SQL to run in the Supabase Dashboard SQL Editor.

4. **Did you use a new ShadcnUI component not yet installed?**
   Tell user: `npx shadcn@latest add <component-name>`

5. **Did the database schema change?**
   Tell user: Regenerate types with `npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/database.types.ts`

## Formatting the commands

Always present required commands in a clear block at the end of your response:

```
## Required actions after this change:
1. Install new dependencies: `npm install`
2. Add card component: `npx shadcn@latest add card`
3. Restart dev server: `npm run dev`
```

If no actions are required, explicitly state: "No additional commands needed."

## Code Conventions

- Use TypeScript strict mode.
- Use App Router (`src/app/`), not Pages Router.
- Default to Server Components. Only use `"use client"` when client interactivity is needed.
- Supabase clients must not crash if env vars are missing — return null and log a warning.
- Use `@/` import alias for all project imports.
- ShadcnUI components live in `src/components/ui/`. Custom components go in `src/components/`.
- Use Lucide React for icons — import from `lucide-react`.
