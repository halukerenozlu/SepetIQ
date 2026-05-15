from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import decisions

logger = logging.getLogger(__name__)

app = FastAPI(
    title="SepetIQ API",
    version="0.1.0",
    description=("Agentic AI alışveriş danışmanı — ürün önerisi değil, sorgulaması."),
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "http://localhost:5173",  # Vite extension dev
        "https://sepetiq.vercel.app",  # Production companion web
    ],
    allow_origin_regex=r"^chrome-extension://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(decisions.router)

# ─────────────────────────────────────────────────────────────────────────────
# Utility endpoints
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/")
def root() -> dict:
    return {"status": "ok", "project": "SepetIQ"}


@app.get("/api/v1/health")
def health() -> dict:
    return {
        "status": "healthy",
        "version": "0.1.0",
        "dependencies": {
            "database": "not_configured",
            "gemini_api": "not_configured",
            "langgraph": "ok",
        },
    }
