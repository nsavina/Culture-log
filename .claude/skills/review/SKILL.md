---
name: review
disable-model-invocation: true
description: Review current branch changes before PR. Checks project convention compliance, code quality, and prepares a PR description.
---

# Task Review

Validates branch changes before creating a pull request.

## Workflow

### Step 1: Analyze All Changes in the Current Branch

Review all changes relative to the base branch, not just staged files.

1. **Determine base branch** — prefer repo default, fall back to `main` or `master`.
2. **Gather diff info**:

```bash
git diff --stat $(git merge-base HEAD <base-branch>)..HEAD
git diff $(git merge-base HEAD <base-branch>)..HEAD
git diff --name-only $(git merge-base HEAD <base-branch>)..HEAD
```

### Step 2: Project Convention Compliance

Check the diff against the project conventions from `CLAUDE.md` and `AGENTS.md`:

- TypeScript strict mode; no `any` leaks.
- App Router (`src/app/`), Server Components by default — `"use client"` only where interactivity is needed.
- `@/` import alias for all project imports.
- ShadcnUI primitives in `src/components/ui/`, custom components in `src/components/`; icons from `lucide-react`.
- Supabase clients degrade gracefully when env vars are missing (return null + warning, no crash).
- DB changes come with a migration in `supabase/migrations/` (via `npx supabase`).
- API routes: auth check, Zod validation of request bodies, rate limiting.

If a `project-arch` skill is available, load it and apply its rules as well.

### Step 3: Prepare Pull Request Summary

**Format:**

```md
## Summary
{short summary of the change}

## What Changed
- {change 1}
- {change 2}
- {change 3}

## Notes
- {important implementation note or risk}
```

Keep it concise and suitable for a PR body.

### Step 4: Output Review Report

```md
### Changes Summary
- Files modified: {count}
- Lines: +{added}/-{removed}

### Convention Compliance
- [x/!] {rule}: {comment}

### Acceptance Criteria Validation
(only if a task/issue description is available; otherwise skip this section)
- [x/!] {criterion}: {comment}

### Code Quality
- [x/!] No obvious bugs spotted
- [x/!] Error handling looks sufficient
- [x/!] Changes are scoped appropriately
- [x/!] Tests added or updated where needed
- [x/!] No obvious dead code or accidental leftovers

### PR Readiness
- **Status:** Ready / Needs fixes
- **Main issues to address:** {list if any}

### Suggested PR Description

## Summary
{short summary}

## What Changed
- {change 1}
- {change 2}

## Notes
- {note if applicable}
```

Use `[x]` for passing checks and `[!]` for failing, incomplete, or unclear checks.

## Error Handling

| Error | Action |
|---|---|
| Base branch not detected | Fall back to `main`, then `master`, mention the assumption |
| No diff against base | Report that there are no branch changes to review |
