# AGENTS.md — Instructions for Codex + GitHub Copilot CLI

This repository uses **4 AI coding agents**:

- **Claude Code** (senior architect) — Reads `CLAUDE.md`. Handles architecture, project structure, and critical changes — everything if needed.
- **Gemini CLI** (coding agent, frontend-focused) — Reads `GEMINI.md`.
- **GitHub Copilot CLI** (general assistant) — Reads **only this file** and follows the general rules.
- **You — Codex** (coding agent + code reviewer) — You are reading this file.

This file uses the `AGENTS.md` open standard format — both Codex and GitHub Copilot CLI read this file.

## Codex Role: Coding + Code Review

**You have a dual role:**

1. **Coding** — Backend, logic-heavy parts, tasks delegated by Claude, frontend (in parallel with Gemini)
2. **Code review** — Review code written by all agents (Claude, Gemini)

Starting large features and changing architectural decisions are owned only by Claude. `docs/SPEC.md` is always the source of truth.

## GitHub Copilot CLI Role

General assistant. It follows the rules in this file (tech stack, commands, forbidden list). It has no special role.

## Project Summary

**SepetIQ** is an agentic AI extension that activates on e-commerce pages. It does not recommend products — it questions whether the user should really buy the intended product using 3 scores and 7 LLM agents. It is a hackathon (SHACKATHON'26) project.

**Naming warning:** This file (`AGENTS.md`) is for AI coding agents. SepetIQ's **own 7-LLM agent system** is defined in `docs/AGENT_SYSTEM.md`. Do not confuse them.

## Single Source of Truth: `docs/` Folder

Before review or coding, **read `docs/SPEC.md` first.** Then navigate to the relevant sub-document.

Document priority (if conflicts occur):

1. `docs/SPEC.md` — Master, authoritative
2. Task-specific document
3. User chat instructions (instant overrides)

## Repo Structure

```
sepetiq/
├── CLAUDE.md                       ← Claude Code instructions
├── AGENTS.md                       ← This file (Codex)
├── GEMINI.md                       ← Gemini CLI instructions
├── .github/
│   └── copilot-instructions.md     ← GitHub Copilot instructions
├── docs/                           ← Single source of truth
├── backend/                        ← Python 3.12 + FastAPI + LangGraph + uv
├── web/                            ← Next.js 15 + React + TypeScript + Tailwind
└── extension/                      ← Vite + React + TypeScript
```

## Tech Stack and Commands

| Layer     | Stack                                                   | Package Manager |
| --------- | ------------------------------------------------------- | --------------- |
| Backend   | Python 3.12, FastAPI, LangGraph, Pydantic V2, Supabase | `uv`            |
| Web       | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui  | `pnpm`          |
| Extension | Vite, React, TypeScript, @crxjs/vite-plugin            | `pnpm`          |

```bash
# Backend
cd backend && uv sync && uv run uvicorn main:app --reload
uv run ruff check . && uv run ruff format .

# Web
cd web && pnpm install && pnpm dev

# Extension
cd extension && pnpm install && pnpm dev
```

**NEVER:** Suggest `npm` or `bun`. This project uses **pnpm**. On Python side, use **`uv`**, not pip.

## Code Review Checklist

When a PR/change arrives, check these in order:

### 🔴 Critical (Reject)

- [ ] **DNA Violation:** Is there any "product recommendation" logic? (SepetIQ questions, it does not recommend. `docs/PRODUCT.md`)
- [ ] **Unstructured LLM Output:** Is a Gemini API call made without a Pydantic schema?
- [ ] **Hardcoded Secret:** Any API key, JWT token, or Gemini key in code?
- [ ] **Demo / Production Mix-up:** Did `demo_*` tables leak into real user flow?
- [ ] **RLS Bypass:** Is Service Role used where it must not be used?

### 🟡 Important (Discuss)

- [ ] **Unhandled Error:** Missing try/except or error boundary?
- [ ] **Missing Types:** Any TypeScript `any` or missing Python type hints?
- [ ] **New Dependency:** Was a package added without asking? (`pnpm-lock.yaml` / `uv.lock` change)
- [ ] **Manual Lockfile Edit:** Was lockfile edited manually?
- [ ] **docs/ Inconsistency:** Is code inconsistent with docs/?

### 🟢 Improvement (Suggest)

- [ ] **Performance:** N+1 query, unnecessary LLM call, sync work that could be async?
- [ ] **Readability:** Very long function, naming issues, magic numbers?
- [ ] **Missing Tests:** Missing tests for critical path?

## When Suggesting Refactors

- **Keep it small.** Do not say "rewrite the whole file." Suggest surgical changes.
- **Explain why.** "This is better" is not enough. Explain "in X case, Y problem happens."
- **Hackathon priority.** Do not suggest a 2-hour refactor just for cleanliness. If it works, hackathon wins.

## Secondary Role: Small Assistance

The user may delegate these to you (without occupying Claude):

- Test writing (pytest backend, vitest frontend)
- Adding type hints
- Filling docstrings / JSDoc
- Bug fixes (1–5 lines)
- Keeping `docs/` files up to date
- Lint/format fixes

## Behavior Rules

### YOU MUST: Respond in Turkish

The user is Turkish. Responses must be in Turkish. Code and commit messages stay in English. When using abbreviations, include English + Turkish in parentheses (e.g., "RLS (Row Level Security — Satır Düzeyinde Güvenlik)").

### YOU MUST: Run First, Confirm Later

If you suggest a code change, **run/test first**, then say "done."

### YOU MUST: Keep PR Comments Constructive

Tone: respectful, direct, solution-focused. Not "This is wrong," but "There may be an issue here; we can fix it like this."

### NEVER: Change Architectural Decisions

Architectural decisions are made in `docs/SPEC.md`. If it looks wrong, **ask the user**, do not change it.

### NEVER: Add New Dependencies Without Asking

If a new package is needed, ask first.

### NEVER: Touch Lockfiles Manually

No manual edits. Update only through commands.

### NEVER: Do Claude or Gemini's Job

If a large feature/UI implementation request comes, redirect: "This task is better suited for Claude / Gemini."

## PR / Commit Message Format

```
feat: add review risk analyzer agent
fix: handle gemini timeout in product context
docs: update AGENT_SYSTEM.md with cyclic flow details
chore: add demo data seed script
refactor: extract score calculation to separate module
test: add need score edge case tests
```

Message must be in English, lowercase, and start with a verb.

## Hackathon Priority

Every suggestion must pass the "Will it appear in a 5-minute demo?" test. If no → put it in backlog with a V2 label.

Details: `docs/ROADMAP.md` (phase-based plan) and `docs/DEMO.md`.

## Important Architectural Decisions

- **LangGraph state persistence:** Start with `MemorySaver` (in-memory), optional `RedisSaver` later
- **SSE reconnect:** Browser defaults are enough, no custom logic
- **Timezone:** Sent by frontend, used by backend, stored as UTC in DB
- **Onboarding:** Frictionless, guided with a dashboard banner
- **Demo OAuth:** URL param bypass via `?demo=true&user=ayse`

## Review Output Format

Structure your review reports as follows:

```
## Summary
[3-4 sentence overview of what the code does and overall quality]

## Issues
### 🔴 Critical
- [issue description] — [file:line]

### 🟡 High
- [issue description] — [file:line]

### 🔵 Medium
- [issue description] — [file:line]

### ⚪ Low
- [issue description] — [file:line]

## Suggestions
- [optional improvement ideas that are not issues]

## Verdict
**APPROVE** / **REQUEST CHANGES**
[2-4 sentence justification]
```

If there are zero critical or high issues, verdict is APPROVE. Otherwise, REQUEST CHANGES.

---

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
