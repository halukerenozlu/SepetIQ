# GitHub Copilot Instructions

AI coding agent rules for this repo are defined in `AGENTS.md` (repo root).
**Read `AGENTS.md` and follow its rules.**

Your role: General assistant. Quick tasks, inline completions, small fixes.
Large features go to Claude, frontend work to Gemini, code review to Codex.

## Shared Skills Reference

Rules extracted from `.claude/skills/` — follow these when writing or reviewing code.

### Brainstorming

- **Never implement before design approval.** Present the design and get explicit user sign-off first.
- **One question at a time.** Prefer multiple-choice.
- **Always propose 2-3 approaches** with trade-offs and a clear recommendation.
- **YAGNI ruthlessly.** Remove unnecessary features from every design.
- **Design for isolation.** Each unit: one purpose, clear interface, testable independently.
- **Follow existing patterns.** Explore current structure before proposing changes.
- **Write and commit a spec document** before transitioning to implementation.
- **Self-review specs** for placeholders, contradictions, ambiguity, and scope creep.

### Improve Codebase Architecture

- **Use consistent vocabulary.** Module, Interface, Implementation, Depth, Seam, Adapter, Leverage, Locality.
- **Deep modules > shallow modules.** A lot of behavior behind a small interface.
- **Apply the deletion test.** If deleting a module moves complexity to N callers, it was earning its keep.
- **One adapter = hypothetical seam. Two adapters = real seam.**
- **The interface is the test surface.** Test through the module's interface, not internals.
- **Read domain glossary and ADRs first** before exploring for refactoring.
- **Present candidates, do not propose interfaces yet.** Let user choose first.
- **Record load-bearing rejections as ADRs.**

### shadcn/ui

- **Use existing components first.** Search registries before writing custom UI.
- **Compose, don't reinvent.** Combine existing components rather than building from scratch.
- **Use built-in variants before custom styles.** `variant="outline"`, `size="sm"`, etc.
- **Use semantic colors.** `bg-primary`, `text-muted-foreground` — never raw values like `bg-blue-500`.
- **`className` is for layout, not styling.** Never override component colors or typography.
- **No `space-x-*`/`space-y-*`.** Use `flex` with `gap-*`.
- **Forms use `FieldGroup` + `Field`.** Validation uses `data-invalid` + `aria-invalid`.
- **Dialog, Sheet, Drawer always need a Title** for accessibility.

### Supabase Postgres Best Practices

- **Add indexes on WHERE and JOIN columns.** Missing indexes cause 100-1000x slower queries (CRITICAL).
- **Use connection pooling.** Direct connections exhaust limits fast (CRITICAL).
- **Always enable RLS** on tables with user data (CRITICAL).
- **Design schemas with proper constraints.** NOT NULL, CHECK, foreign keys (HIGH).
- **Eliminate N+1 queries.** Use batch loading or joins (MEDIUM).
- **Use EXPLAIN ANALYZE** to verify query plans before deploying.
- **Avoid long-running transactions** that hold locks (MEDIUM-HIGH).
- **Use partial indexes** for queries filtering on specific subsets.

### Vercel React Best Practices

- **Eliminate async waterfalls.** Use `Promise.all()` for independent operations (CRITICAL).
- **Optimize bundle size.** Import directly (avoid barrel files), use `next/dynamic` for heavy components (CRITICAL).
- **Use React Server Components + Suspense** to stream content (HIGH).
- **Authenticate server actions** the same way as API routes (HIGH).
- **Minimize data passed to client components.** Serialize only what the client needs (HIGH).
- **Avoid re-renders.** Hoist default props, use functional `setState`, derive state during render (MEDIUM).
- **Use `startTransition`** for non-urgent updates (MEDIUM).
- **Preload on hover/focus** for perceived speed (MEDIUM).

### Web Design Guidelines

- **Fetch latest guidelines before every review** — rules update over time.
- **Review against ALL rules**, not just a subset.
- **Output findings in terse `file:line` format.**
- **Check accessibility** (semantic HTML, ARIA, keyboard nav, color contrast).
- **Validate responsive behavior** across breakpoints.
- **Ensure consistent spacing, typography, and color usage** per design tokens.
