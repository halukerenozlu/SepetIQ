# SepetIQ — Conscious Shopping Assistant

[![Backend](https://img.shields.io/badge/backend-FastAPI-009688?style=flat-square)](backend)
[![Web](https://img.shields.io/badge/web-Next.js%2016-111111?style=flat-square)](frontend/web)
[![Extension](https://img.shields.io/badge/extension-Vite%20%2B%20React-646CFF?style=flat-square)](frontend/extension)
[![Package Manager](https://img.shields.io/badge/package%20manager-pnpm-F69220?style=flat-square)](frontend)
[![Python](https://img.shields.io/badge/python-3.13-2E5BFF?style=flat-square)](backend)
[![Python Package Manager](https://img.shields.io/badge/python%20package%20manager-uv-2E5BFF?style=flat-square)](backend)

> Against the "Buy Now" pressure of e-commerce, the consumer's first **"Think" button.**

SepetIQ is an **agentic AI browser extension** that activates on e-commerce pages. It does not recommend products — it questions whether you should really buy the product you intend to, using 3 scores (Product Fit, Review Risk, Need Score) and 7 LLM agents.

**DNA:** SepetIQ doesn't tell you what to buy — it questions whether you should really buy what you're about to.

---

## How It Works

### 3 Scores

| Score                   | Meaning                                        |
| ----------------------- | ---------------------------------------------- |
| **Product Fit** (0-100) | Does the product technically match your needs? |
| **Review Risk** (0-100) | Are the reviews trustworthy? (High = low risk) |
| **Need Score** (0-100)  | Do you actually need this product?             |

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
│                   (Next.js 16 + Tailwind)                   │
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

## Hackathon Demo Site Coverage

For the hackathon demo, the extension is optimized for a focused set of real
shopping sites instead of broad production coverage:

| Site             | Scope                         |
| ---------------- | ----------------------------- |
| n11              | Product pages                 |
| Trendyol         | Product pages                 |
| Hepsiburada      | Product pages                 |
| Amazon Turkey    | `amazon.com.tr` product pages |
| Local demo store | `localhost:3001/product/*`    |

This list is intentionally small: the goal is to prove that SepetIQ can read
real product pages, open the decision panel, and run the agentic analysis flow
reliably during a 5-minute demo. Wider marketplace support is a post-hackathon
hardening task.

---

## Tech Stack

| Layer     | Technology                                             | Package Manager |
| --------- | ------------------------------------------------------ | --------------- |
| Backend   | Python 3.13, FastAPI, LangGraph, Pydantic V2, Supabase | `uv`            |
| Web       | Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui  | `pnpm`          |
| Extension | Vite, React, TypeScript, @crxjs/vite-plugin            | `pnpm`          |
| LLM       | Gemini 2.5 Flash                                       | —               |
| Auth      | Supabase Auth (Google OAuth)                           | —               |
| Deploy    | Backend: Railway · Web: Vercel                         | —               |

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
├── frontend/
│   ├── web/                # Next.js companion web
│   └── extension/          # Vite browser extension
└── supabase/               # Supabase configuration and migrations
```

---

## Quick Start

Start the backend first in its own terminal. Do not manually activate
`backend/.venv`; `uv run` uses the correct environment automatically.

```powershell
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

Then start the frontend apps in separate terminals:

```powershell
# Web (Next.js)
cd frontend/web
pnpm install
pnpm dev

# Local demo store
cd demo
pnpm install
pnpm dev

# Extension (Vite + React)
cd frontend/extension
pnpm install
pnpm build
```

### Windows / VS Code Note

If VS Code automatically activates the backend virtualenv when a Python file is
opened, it can inject `Activate.ps1` into the current terminal and interrupt
running `pnpm dev`, `pnpm build`, or `uvicorn --reload` processes.

Keep this workspace setting in `.vscode/settings.json`:

```json
{
  "python.terminal.activateEnvironment": false,
  "python.terminal.activateEnvInCurrentTerminal": false
}
```

After changing this setting, close the affected terminals and open new ones.
Backend should run only in the backend terminal with `uv run`; web, demo, and
extension terminals should use normal `pnpm` commands.

---

## Supabase Migrations

Run the migrations in order from `supabase/migrations/`:

```text
001_initial_schema.sql
002_add_consent_fields.sql
003_add_score_breakdown.sql
```

`003_add_score_breakdown.sql` adds `decisions.score_breakdown`, which is used by the dashboard and decision detail pages to show Product, Need, Budget, and Behavior scores. If this migration is missing, the backend still falls back to `decision_scores`, but the new score breakdown will not be stored on the `decisions` row.

---

## Extension Local Install

1. Start the backend at `http://localhost:8000`.
2. Start the web dashboard at `http://localhost:3000`.
3. Build the extension:

```bash
cd frontend/extension
pnpm build
```

4. Open `chrome://extensions` in Chrome.
5. Enable **Developer mode**.
6. Click **Load unpacked**.
7. Select `frontend/extension/dist` (the folder that contains `manifest.json`).
8. Open `http://localhost:3000/dashboard` and sign in.
9. Visit a supported product page and use the SepetIQ button.

For jury review, sign in with the test account used for the demo. Analysis
results are saved to the Supabase database and appear in the dashboard decision
history after a product analysis completes.

The dashboard Preferences page includes a reset action for clearing saved
decision history, previous shopping records, and personalization settings. This
is meant to prepare a clean demo state while keeping the signed-in account
available for continued testing.

The extension defaults to `http://localhost:8000` for the backend. If you use a different backend URL, update the `apiBase` value in Chrome extension storage.

For a clean Chrome-profile smoke test on Windows, launch Chrome with a temporary
profile and then use the same manual **Load unpacked** flow:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --user-data-dir="C:\dev\SepetIQ\.tmp\chrome-extension-test" `
  --no-first-run `
  --no-default-browser-check `
  chrome://extensions/
```

Do not rely on `--load-extension` for this smoke test: current Google Chrome
builds ignore that flag for local unpacked extensions, so the manual
`chrome://extensions` flow is the reliable path.

---

## Documentation

| Document                                | Content                                     |
| --------------------------------------- | ------------------------------------------- |
| [SPEC.md](docs/SPEC.md)                 | Master specification — read this first      |
| [PRODUCT.md](docs/PRODUCT.md)           | Vision, DNA, pitch, user personas           |
| [AGENT_SYSTEM.md](docs/AGENT_SYSTEM.md) | 7 LLM agents, LangGraph flow, prompts       |
| [SCORING.md](docs/SCORING.md)           | 3 score calculation, decision matrix, modes |
| [API.md](docs/API.md)                   | FastAPI endpoints, request/response schemas |
| [DATABASE.md](docs/DATABASE.md)         | Supabase tables, RLS policies               |
| [EXTENSION.md](docs/EXTENSION.md)       | Extension architecture, content scripts     |
| [WEB.md](docs/WEB.md)                   | Companion web pages, components             |
| [DEMO.md](docs/DEMO.md)                 | 5-minute pitch scenario                     |
| [ROADMAP.md](docs/ROADMAP.md)           | 7-day development plan                      |
| [ENV.md](docs/ENV.md)                   | Environment variables                       |

---

## Hackathon

Built for BTK Academy, Google & Girvak Hackathon 2026.

**Philosophy:** Friction by Design — intentional friction for conscious decisions.
