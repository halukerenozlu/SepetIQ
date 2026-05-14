# SepetIQ — Conscious Shopping Assistant

> Against the "Buy Now" pressure of e-commerce, the consumer's first **"Think" button.**

SepetIQ is an **agentic AI browser extension** that activates on e-commerce pages. It does not recommend products — it questions whether you should really buy the product you intend to, using 3 scores (Product Fit, Review Risk, Need Score) and 7 LLM agents.

**DNA:** SepetIQ doesn't tell you what to buy — it questions whether you should really buy what you're about to.

---

## How It Works

### 3 Scores

| Score | Meaning |
|-------|---------|
| **Product Fit** (0-100) | Does the product technically match your needs? |
| **Review Risk** (0-100) | Are the reviews trustworthy? (High = low risk) |
| **Need Score** (0-100) | Do you actually need this product? |

### 5 Verdicts

Buy → Conditional Buy → Wait → Don't Buy → Consider Alternative

### 7 LLM Agents (LangGraph Cyclic Flow)

```
Product Context → Review Risk → Behavior Profile
                                     ↓
                              Need Analyzer ↔ User Questions
                                     ↓
                                Need Check ◄─ (cyclic trigger)
                                     ↓
                              Decision Agent → Tone Adapter
```

**Cyclic Intelligence:** Agents work in cycles, not sequentially. When Review Risk detects a critical issue, it triggers Need Analyzer to ask the user dynamic follow-up questions — this is what sets SepetIQ apart from a classic LLM pipeline.

---

## Architecture

```
                     ┌───────────────────┐
                     │   Browser         │
                     │   Extension       │
                     │  (Vite + React)   │
                     └────────┬──────────┘
                              │
┌─────────────────────────────┼──────────────────────────────┐
│                     Companion Web                           │
│                   (Next.js 15 + Tailwind)                   │
└─────────────────────────────┬──────────────────────────────┘
                              │
                     ┌────────▼──────────┐
                     │  Backend (FastAPI) │
                     │  LangGraph (7 Ag.) │
                     │  Gemini 2.5 Flash  │
                     └────────┬──────────┘
                              │
                     ┌────────▼──────────┐
                     │  Supabase         │
                     │  PostgreSQL + Auth │
                     └───────────────────┘
```

**Two-layer companion app:**

- **Layer 1 — Browser Extension:** Runs on real e-commerce pages for quick decisions.
- **Layer 2 — Companion Web:** Profile, decision history, savings statistics.

---

## Tech Stack

| Layer | Technology | Package Manager |
|-------|-----------|-----------------|
| Backend | Python 3.12, FastAPI, LangGraph, Pydantic V2, Supabase | `uv` |
| Web | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui | `pnpm` |
| Extension | Vite, React, TypeScript, @crxjs/vite-plugin | `pnpm` |
| LLM | Gemini 2.5 Flash | — |
| Auth | Supabase Auth (Google OAuth) | — |
| Deploy | Backend: Railway · Web: Vercel | — |

---

## Project Structure

```
sepetiq/
├── AGENTS.md               # AI coding agent instructions (Codex / Copilot)
├── CLAUDE.md               # Claude Code instructions
├── GEMINI.md               # Gemini CLI instructions
├── README.md               # This file
├── docs/                   # Single source of truth (SPEC, API, DB, etc.)
├── backend/                # Python FastAPI + LangGraph
│   ├── agents/             # 7 LLM agent implementations
│   ├── models/             # Pydantic schemas + state
│   ├── services/           # Supabase client, etc.
│   └── main.py             # FastAPI entry point
├── web/                    # Next.js companion web (WIP)
├── extension/              # Vite browser extension (WIP)
└── supabase/               # Supabase configuration
```

---

## Quick Start

```bash
# Backend
cd backend
uv sync
uv run uvicorn main:app --reload

# Web (Next.js)
cd web
pnpm install
pnpm dev

# Extension (Vite + React)
cd extension
pnpm install
pnpm dev
```

---

## Documentation

| Document | Content |
|----------|---------|
| [SPEC.md](docs/SPEC.md) | Master specification — read this first |
| [PRODUCT.md](docs/PRODUCT.md) | Vision, DNA, pitch, user personas |
| [AGENT_SYSTEM.md](docs/AGENT_SYSTEM.md) | 7 LLM agents, LangGraph flow, prompts |
| [SCORING.md](docs/SCORING.md) | 3 score calculation, decision matrix, modes |
| [API.md](docs/API.md) | FastAPI endpoints, request/response schemas |
| [DATABASE.md](docs/DATABASE.md) | Supabase tables, RLS policies |
| [EXTENSION.md](docs/EXTENSION.md) | Extension architecture, content scripts |
| [WEB.md](docs/WEB.md) | Companion web pages, components |
| [DEMO.md](docs/DEMO.md) | 5-minute pitch scenario |
| [ROADMAP.md](docs/ROADMAP.md) | 7-day development plan |
| [ENV.md](docs/ENV.md) | Environment variables |

---

## Hackathon

Built for SHACKATHON'26.

**Philosophy:** Friction by Design — intentional friction for conscious decisions.
