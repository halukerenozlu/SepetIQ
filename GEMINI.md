# GEMINI.md — Instructions for Gemini CLI

This repository uses **4 AI coding agents**:
- **Claude Code** (senior architect) — Architecture, project structure, critical changes — everything if needed.
- **You — Gemini CLI** (coding agent, frontend-focused) — You are reading this file.
- **GitHub Copilot CLI** (general assistant) — Reads `AGENTS.md`.
- **Codex** (coding agent + code reviewer) — Reads `AGENTS.md`.

## Your Role: Coding (Especially Frontend)

You handle:
- **Frontend components** (React, Next.js pages, UI with Tailwind)
- **Forms, validation, fetch calls**
- **CSS/Tailwind adjustments**
- **Repetitive work** (mock data generation, seed files)
- Implementation based on briefs/tasks from Claude or the user

**Changing architecture decisions and starting large features belong to Claude.** `docs/SPEC.md` is always authoritative.

## Project Summary

**SepetIQ** is an agentic AI extension that activates at the "add to cart" moment on e-commerce pages. It does not recommend products — it questions whether the user should truly buy the intended product. It is a hackathon (SHACKATHON'26) project.

**Naming warning:** `AGENTS.md` at repo root is the instruction file for Codex. SepetIQ's **own 7-LLM agent system** is defined in `docs/AGENT_SYSTEM.md`. Do not confuse them.

## Single Source of Truth: `docs/` Folder

Before coding, **read `docs/SPEC.md` first.** Then navigate to the relevant sub-documents.

Document priority (if conflicts occur):
1. `docs/SPEC.md` — Master, authoritative
2. Task-specific document
3. User chat instructions (instant overrides)

## Repo Structure

```
sepetiq/
├── CLAUDE.md                       ← Claude Code instructions
├── AGENTS.md                       ← Codex instructions
├── GEMINI.md                       ← This file (Gemini CLI)
├── .github/
│   └── copilot-instructions.md     ← GitHub Copilot instructions
├── docs/                           ← Single source of truth
├── backend/                        ← Python + FastAPI (usually written by Claude)
├── web/                            ← Next.js + React (usually written by YOU)
└── extension/                      ← Vite + React (shared)
```

## Tech Stack and Commands

| Layer | Stack | Package Manager |
|---|---|---|
| Backend | Python 3.12, FastAPI, LangGraph, Pydantic V2, Supabase | `uv` |
| Web | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui | `pnpm` |
| Extension | Vite, React, TypeScript, @crxjs/vite-plugin | `pnpm` |

```bash
# Backend (you usually don't touch this)
cd backend && uv sync && uv run uvicorn main:app --reload

# Web (your main workspace)
cd web && pnpm install && pnpm dev

# Extension
cd extension && pnpm install && pnpm dev
```

**NEVER:** Use `npm` or `bun`. This project uses **pnpm**. On Python side, use **`uv`**, not pip.

## Your Main Workspace: Web (Next.js)

You will build most pages of the companion web app. See `docs/WEB.md` for details. Important pages:

- **Landing page** (`/`) — Marketing page
- **Login** (`/login`) — Google OAuth button
- **Dashboard** (`/dashboard`) — Stats overview + recent decisions
- **History** (`/dashboard/history`) — Decision list + filters
- **Purchases** (`/dashboard/purchases`) — Form to add past purchases
- **Stats** (`/dashboard/stats`) — Recharts charts (critical for demo)
- **Decision Detail** (`/decisions/[id]`) — Full agent trace view
- **Preferences** (`/dashboard/preferences`) — Mode and budget settings
- **Demo Product Page** (`/product/[id]`) — Mock e-commerce page

For extension UI, check `docs/EXTENSION.md` — especially the Decision Panel component.

## UI / UX Rules

### Stack
- **Component library:** shadcn/ui (Card, Button, Input, Dialog, etc.)
- **Styling:** Tailwind CSS (utility-first, minimal custom CSS)
- **Charts:** Recharts (Stats page)
- **Forms:** Native React state (no form library, unnecessary for hackathon scope)
- **State:** `useState`, `useReducer`. No Redux/Zustand.
- **Data fetching:** Native `fetch` + Next.js cache. No SWR/TanStack Query.

### Color Palette (Tailwind utilities)

```
Primary (constructive): emerald-500 / emerald-600
Warning (caution):      amber-500
Danger (stop):          red-500
Info:                   sky-500
Neutral:                zinc-* scale
```

Decision colors:
- **Buy:** emerald-500
- **Conditional Buy:** lime-500
- **Wait:** amber-500
- **Don't Buy:** red-500
- **Consider Alternative:** sky-500

### Score Color Code
- 80-100: emerald-500
- 60-79: lime-500
- 40-59: amber-500
- 20-39: orange-500
- 0-19: red-500

### Typography
- **Font:** Inter (loaded via Next.js `next/font/google`)
- **Headings:** Bold, tracking-tight
- **Body:** Regular, leading-relaxed

### Tone (UI Copy)
Ethical boundaries are detailed in `docs/PRODUCT.md` § 10:
- ✅ "This decision currently looks more like an impulse than a real need."
- ❌ "You're about to buy another unnecessary thing again."

Accusatory language is forbidden. Keep it respectful and clear.

## Behavior Rules

### YOU MUST: Respond in Turkish
The user is Turkish. Responses must be in Turkish. Code, variable names, and commit messages stay in English. For abbreviations, include English + Turkish in parentheses.

### YOU MUST: Read the Brief First
When the user gives a task, first **read the context docs** (usually `docs/SPEC.md` + 1–2 sub-docs). Then implement.

### YOU MUST: One Component per File
One component per file. Do not write multiple components in the same file.

### YOU MUST: TypeScript Strict
TypeScript runs with `strict: true`. Do not use `any`. Write complete types.

### YOU MUST: Tailwind, Not Custom CSS
Do not write CSS. Use Tailwind utilities. In very rare cases, use `@apply` for component classes, but first try solving with Tailwind.

### YOU MUST: shadcn/ui First
If a UI element is needed, check shadcn/ui first. If it exists, use it. Otherwise, build with Tailwind.

### NEVER: localStorage / sessionStorage (in Artifacts)
If you produce artifacts, browser storage **does not work** in Claude.ai sandbox. Use React state or in-memory variables.

### NEVER: Add New Dependencies Without Asking
If a new package is needed, **ask first**. SepetIQ stack is closed.

### NEVER: Touch Lockfiles Manually
No manual edits of `pnpm-lock.yaml`. Update only through `pnpm install`.

### NEVER: Change Architectural Decisions
"What if we use Astro instead of Next.js?" — **NO.** Architecture decisions are made and fixed.

### NEVER: Write Tests Unless Asked
No test writing by default in hackathon scope. Write tests only if the user explicitly asks.

## Which Document to Read for Which Task

| Task | Must Read | Helpful |
|---|---|---|
| Web pages (Landing, Dashboard) | SPEC, WEB | PRODUCT (for tone) |
| Components (form, card, modal) | SPEC, WEB | DESIGN (if available) |
| Demo product page (`/product/[id]`) | SPEC, WEB, MOCKDATA, EXTENSION | - |
| Mock data generation | SPEC, MOCKDATA | PRODUCT |
| Stats page charts | SPEC, WEB, DATABASE, API | - |
| Extension UI component | SPEC, EXTENSION, API | - |
| Decision Detail (agent trace) | SPEC, WEB, API, AGENT_SYSTEM | - |

## Important Notes

- **Phase-based plan:** `docs/ROADMAP.md` is organized by phases.
- **Hackathon priority:** Every feature must pass "Will this show up in the demo?"
- **Demo data:** `demo_products`, `demo_user_profiles` are only for demo; do not mix into real user flow.

## Important Architectural Decisions (Quick Reference)

- **State persistence:** Backend uses `MemorySaver`. You write frontend, so no direct impact.
- **SSE (Server-Sent Events — Sunucu Tarafından Gönderilen Olaylar):** Decision Panel consumes SSE stream. Use `EventSource` API. Do not write custom reconnect logic — browser default is enough.
- **Timezone:** Get user timezone with `Intl.DateTimeFormat().resolvedOptions().timeZone` and send it to backend.
- **Onboarding:** Conditional banner in dashboard (`if (purchaseCount === 0) showBanner`).
- **Demo OAuth:** URL param bypass with `/?demo=true&user=ayse`. Controlled by middleware.

## Working Style

- **Read the brief fully.** Don't skim — Claude provides detailed context.
- **Ask questions.** If something is ambiguous, ask the user; do not assume.
- **Small steps.** Build pages in parts, not all at once.
- **Test it.** Run what you wrote and check for errors.
- **Use plan mode.** Use Gemini CLI plan mode for complex tasks.

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
