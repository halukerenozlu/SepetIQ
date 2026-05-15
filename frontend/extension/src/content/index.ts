/**
 * content/index.ts - Content script entry point
 *
 * Detects product pages, mounts the Shadow DOM panel, and bridges messages
 * between the page UI and the background service worker.
 */

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { TrendyolScraper } from "./scraper/trendyol";
import { GenericScraper } from "./scraper/generic";
import { DecisionPanel } from "../panel";
import { MSG } from "../shared/messages";
import type {
  AnalysisMode,
  AnalysisStatus,
  NeedQuestion,
  SSEEvent,
} from "../shared/types";
import type {
  AnalysisCompleteMsg,
  AnalysisErrorMsg,
  ExtensionMessage,
  SseEventMsg,
} from "../shared/messages";

const SCRAPERS = [new TrendyolScraper(), new GenericScraper()];
const PANEL_HOST_ID = "sepetiq-panel-host";
const FAB_HOST_ID = "sepetiq-fab-host";

let panelRoot: Root | null = null;
let panelHost: HTMLElement | null = null;
let events: SSEEvent[] = [];
let status: AnalysisStatus = "idle";
let questions: NeedQuestion[] = [];
let decisionId: string | undefined;
let mode: AnalysisMode = "balanced";

function getActiveScraper() {
  const url = window.location.href;
  return SCRAPERS.find((scraper) => scraper.canHandle(url)) ?? null;
}

function ensurePanelRoot(): void {
  if (panelRoot && panelHost) {
    panelHost.style.display = "";
    return;
  }

  panelHost = document.getElementById(PANEL_HOST_ID);
  if (!panelHost) {
    panelHost = document.createElement("div");
    panelHost.id = PANEL_HOST_ID;
    panelHost.style.cssText =
      "all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;";
    document.body.appendChild(panelHost);
  }

  const shadow = panelHost.shadowRoot ?? panelHost.attachShadow({ mode: "open" });
  let mount = shadow.getElementById("sepetiq-panel-root");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "sepetiq-panel-root";
    mount.style.cssText = "pointer-events: auto;";
    shadow.appendChild(mount);
  }

  panelRoot = createRoot(mount);
}

function renderPanel(): void {
  ensurePanelRoot();

  panelRoot?.render(
    React.createElement(DecisionPanel, {
      events,
      status,
      questions,
      decisionId,
      onAnswerSubmit: handleAnswerSubmit,
      onRetry: startAnalysis,
      onClose: hidePanel,
      mode,
    }),
  );
}

function hidePanel(): void {
  if (panelHost) panelHost.style.display = "none";
}

function setPanelState(nextStatus: AnalysisStatus): void {
  status = nextStatus;
  renderPanel();
}

function appendEvent(event: SSEEvent): void {
  events = [...events, event];
  renderPanel();
}

function resetAnalysisState(): void {
  events = [];
  status = "analyzing";
  questions = [];
  decisionId = undefined;
}

function handleAnswerSubmit(answers: Record<string, string>): void {
  if (!decisionId) return;
  questions = [];
  setPanelState("analyzing");
  chrome.runtime.sendMessage({
    type: MSG.ANSWER_SUBMIT,
    decisionId,
    answers,
  });
}

function injectFab(): void {
  if (document.getElementById(FAB_HOST_ID)) return;

  const fabHost = document.createElement("div");
  fabHost.id = FAB_HOST_ID;
  fabHost.style.cssText =
    "all: initial; position: fixed; bottom: 24px; right: 24px; z-index: 2147483646;";
  document.body.appendChild(fabHost);

  const fabShadow = fabHost.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    button {
      min-height: 44px;
      border: 0;
      border-radius: 999px;
      padding: 0 18px;
      background: #6366f1;
      color: white;
      box-shadow: 0 14px 34px rgba(79, 70, 229, 0.35);
      cursor: pointer;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
      transition: background 140ms ease, transform 140ms ease;
    }
    button:hover { background: #4f46e5; transform: translateY(-1px); }
    button:active { transform: translateY(0) scale(0.98); }
  `;
  fabShadow.appendChild(style);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "SepetIQ ile Kontrol Et";
  button.addEventListener("click", startAnalysis);
  fabShadow.appendChild(button);
}

function startAnalysis(): void {
  const scraper = getActiveScraper();
  if (!scraper) return;

  const product = scraper.scrape();
  resetAnalysisState();
  renderPanel();

  if (!product) {
    appendEvent({
      eventType: "error",
      data: { error: "Ürün bilgisi alınamadı." },
    });
    setPanelState("error");
    return;
  }

  chrome.runtime.sendMessage({
    type: MSG.ANALYZE_REQUEST,
    product,
    mode,
  });
}

chrome.runtime.onMessage.addListener((rawMsg: unknown) => {
  const message = rawMsg as ExtensionMessage;

  if (message.type === MSG.SSE_EVENT) {
    const { eventType, data } = message as SseEventMsg;
    appendEvent({ eventType, data });

    if (eventType === "agent_start" || eventType === "agent_complete") {
      status = "analyzing";
    } else if (eventType === "questions") {
      const payload = readObject(data);
      questions = Array.isArray(payload.questions)
        ? (payload.questions as NeedQuestion[])
        : [];
      decisionId =
        typeof payload.decision_id === "string" ? payload.decision_id : undefined;
      status = "questions";
    } else if (eventType === "verdict" || eventType === "done") {
      status = "complete";
    } else if (eventType === "error") {
      status = "error";
    }

    renderPanel();
  }

  if (message.type === MSG.ANALYSIS_ERROR) {
    const err = (message as AnalysisErrorMsg).error;
    appendEvent({ eventType: "error", data: { error: err } });
    setPanelState("error");
  }

  if (message.type === MSG.ANALYSIS_COMPLETE) {
    const result = (message as AnalysisCompleteMsg).result;
    appendEvent({
      eventType: "verdict",
      data: {
        verdict: result.verdict,
        score: result.score,
        headline: result.headline,
        body: result.body,
        suggested_action: result.suggestedAction,
      },
    });
    setPanelState("complete");
  }

  return false;
});

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

injectFab();

