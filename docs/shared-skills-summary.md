# Shared Skills Summary

Extracted actionable rules from `.claude/skills/` for use by all AI agents in this project.

---

## Brainstorming

- **Never implement before design approval.** Present the design and get explicit user sign-off first — no exceptions, even for "simple" projects.
- **One question at a time.** Prefer multiple-choice. Do not overwhelm with multi-part questions.
- **Always propose 2-3 approaches** with trade-offs and a clear recommendation before settling.
- **YAGNI ruthlessly.** Remove unnecessary features from every design.
- **Design for isolation.** Each unit should have one purpose, a clear interface, and be testable independently.
- **Follow existing patterns.** In existing codebases, explore the current structure before proposing changes.
- **Write and commit a spec document** before transitioning to implementation planning.
- **Self-review specs** for placeholders, internal contradictions, ambiguity, and scope creep before asking user to review.

## Improve Codebase Architecture

- **Use consistent vocabulary.** Module, Interface, Implementation, Depth, Seam, Adapter, Leverage, Locality — do not drift into "service," "boundary," "component."
- **Deep modules > shallow modules.** A lot of behavior behind a small interface is the goal.
- **Apply the deletion test.** If deleting a module just moves complexity to N callers, it was earning its keep. If complexity vanishes, it was a pass-through.
- **One adapter = hypothetical seam. Two adapters = real seam.** Do not create abstractions for a single concrete implementation.
- **The interface is the test surface.** Test through the module's interface, not its internals.
- **Read domain glossary and ADRs first** before exploring code for refactoring opportunities.
- **Present candidates, do not propose interfaces yet.** Let the user choose which opportunity to explore before designing solutions.
- **Record load-bearing rejections as ADRs** so future reviews do not re-suggest the same refactor.

## shadcn/ui

- **Use existing components first.** Search registries (`npx shadcn@latest search`) before writing custom UI.
- **Compose, don't reinvent.** Combine existing components (Tabs + Card + form controls) rather than building from scratch.
- **Use built-in variants before custom styles.** `variant="outline"`, `size="sm"`, etc.
- **Use semantic colors.** `bg-primary`, `text-muted-foreground` — never raw values like `bg-blue-500`.
- **`className` is for layout, not styling.** Never override component colors or typography via className.
- **No `space-x-*`/`space-y-*`.** Use `flex` with `gap-*` for spacing.
- **Forms use `FieldGroup` + `Field`.** Never raw `div` for form layout. Validation uses `data-invalid` + `aria-invalid`.
- **Dialog, Sheet, and Drawer always need a Title** (`DialogTitle`, `SheetTitle`, `DrawerTitle`) for accessibility.

## Supabase Postgres Best Practices

- **Add indexes on WHERE and JOIN columns.** Missing indexes cause 100-1000x slower queries on large tables (CRITICAL).
- **Use connection pooling.** Direct connections exhaust limits fast; use PgBouncer/Supavisor in transaction mode (CRITICAL).
- **Always enable Row-Level Security (RLS)** on tables with user data. Never bypass with Service Role unless absolutely necessary (CRITICAL).
- **Design schemas with proper constraints.** NOT NULL, CHECK, foreign keys — enforce data integrity at the database level (HIGH).
- **Eliminate N+1 queries.** Use batch loading or joins instead of per-row queries (MEDIUM).
- **Use EXPLAIN ANALYZE** to verify query plans before deploying. Check for sequential scans on large tables.
- **Avoid long-running transactions** that hold locks and block concurrent operations (MEDIUM-HIGH).
- **Use partial indexes** when queries filter on a specific subset of rows to reduce index size and improve performance.

## Vercel React Best Practices

- **Eliminate async waterfalls.** Use `Promise.all()` for independent operations; check cheap sync conditions before awaiting (CRITICAL).
- **Optimize bundle size.** Import directly (avoid barrel files), use `next/dynamic` for heavy components, defer third-party scripts (CRITICAL).
- **Use React Server Components + Suspense** to stream content and avoid client-side data fetching waterfalls (HIGH).
- **Authenticate server actions** the same way you authenticate API routes (HIGH).
- **Minimize data passed to client components.** Serialize only what the client needs (HIGH).
- **Avoid re-renders.** Hoist default non-primitive props, use functional `setState`, derive state during render instead of effects (MEDIUM).
- **Use `startTransition`** for non-urgent updates to keep the UI responsive (MEDIUM).
- **Preload on hover/focus** for perceived speed; use `content-visibility` for long lists (MEDIUM).

## Web Design Guidelines

- **Fetch latest guidelines before every review** from the source URL — rules update over time.
- **Review against ALL rules** in the fetched guidelines, not just a subset.
- **Output findings in terse `file:line` format** for actionability.
- **Check accessibility** (semantic HTML, ARIA attributes, keyboard navigation, color contrast).
- **Validate responsive behavior** across breakpoints.
- **Ensure consistent spacing, typography, and color usage** following the project's design tokens.
