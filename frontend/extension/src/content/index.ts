/**
 * content/index.ts - Content script entry point
 *
 * Detects product pages, mounts the Shadow DOM panel, and bridges messages
 * between the page UI and the background service worker.
 */

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { SCRAPERS } from "./scraper";
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

const PANEL_HOST_ID = "sepetiq-panel-host";
const FAB_HOST_ID = "sepetiq-fab-host";
const MAX_Z_INDEX = 2147483647;
const GUEST_LIMIT = 10;
const GUEST_COUNT_KEY = "sepetiq_guest_count";

const SLOW_THRESHOLD_MS = 15_000;
const ABORT_THRESHOLD_MS = 35_000;
const ADD_TO_CART_RESCAN_MS = 1500;
const FAB_EDGE_GAP_PX = 24;
const FAB_STACK_GAP_PX = 16;
const BOTTOM_RIGHT_SCAN_WIDTH_PX = 360;
const BOTTOM_RIGHT_SCAN_HEIGHT_PX = 320;
const FAB_POSITION_RESCAN_MS = 1000;

let panelRoot: Root | null = null;
let panelHost: HTMLElement | null = null;
let events: SSEEvent[] = [];
let status: AnalysisStatus = "idle";
let questions: NeedQuestion[] = [];
let decisionId: string | undefined;
const mode: AnalysisMode = "balanced";
let isSlowWarning = false;
let slowTimer: ReturnType<typeof setTimeout> | null = null;
let abortTimer: ReturnType<typeof setTimeout> | null = null;
const answeredDecisionIds = new Set<string>();

function getActiveScraper() {
  const url = window.location.href;
  return SCRAPERS.find((scraper) => scraper.canHandle(url)) ?? null;
}

function ensurePanelRoot(): void {
  if (panelRoot && panelHost) {
    panelHost.style.display = "";
    setFabVisible(false);
    return;
  }

  panelHost = document.getElementById(PANEL_HOST_ID);
  if (!panelHost) {
    panelHost = document.createElement("div");
    panelHost.id = PANEL_HOST_ID;
    panelHost.style.cssText = `all: initial; position: fixed; inset: 0; z-index: ${MAX_Z_INDEX}; pointer-events: none; isolation: isolate;`;
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
  setFabVisible(false);
}

function renderPanel(): void {
  ensurePanelRoot();

  panelRoot?.render(
    React.createElement(DecisionPanel, {
      events,
      status,
      questions,
      decisionId,
      isSlowWarning,
      onAnswerSubmit: handleAnswerSubmit,
      onRetry: startAnalysis,
      onClose: hidePanel,
      mode,
    }),
  );
}

function hidePanel(): void {
  clearAnalysisTimers();
  if (panelHost) panelHost.style.display = "none";
  setFabVisible(true);
}

function clearAnalysisTimers(): void {
  if (slowTimer !== null) {
    clearTimeout(slowTimer);
    slowTimer = null;
  }
  if (abortTimer !== null) {
    clearTimeout(abortTimer);
    abortTimer = null;
  }
  isSlowWarning = false;
}

function setPanelState(nextStatus: AnalysisStatus): void {
  status = nextStatus;
  renderPanel();
}

function appendEvent(event: SSEEvent): void {
  events = [...events, event];
  renderPanel();
}

function setFabVisible(visible: boolean): void {
  if (!fabHostRef) return;
  fabHostRef.style.display = visible ? "" : "none";
}

function hasVerdictEvent(): boolean {
  return events.some((event) => event.eventType === "verdict");
}

function resetAnalysisState(): void {
  events = [];
  status = "analyzing";
  questions = [];
  decisionId = undefined;
}

function isExtensionContextValid(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

function safeSendMessage(message: unknown): void {
  if (!isExtensionContextValid()) {
    showContextInvalidatedError();
    return;
  }
  try {
    chrome.runtime.sendMessage(message);
  } catch {
    showContextInvalidatedError();
  }
}

function showContextInvalidatedError(): void {
  appendEvent({
    eventType: "error",
    data: { error: "Extension yeniden yüklendi. Sayfayı yenileyin (F5)." },
  });
  setPanelState("error");
}

function handleAnswerSubmit(answers: Record<string, string>): void {
  if (!decisionId) return;
  answeredDecisionIds.add(decisionId);
  questions = [];
  setPanelState("analyzing");
  safeSendMessage({
    type: MSG.ANSWER_SUBMIT,
    decisionId,
    answers,
  });
}

const ADD_TO_CART_LISTENER_FLAG = "__sepetiqAtcBound";
const boundAddToCartButtons = new WeakSet<Element>();
let fabHostRef: HTMLElement | null = null;
let fabPositionRaf: number | null = null;

function setupAddToCartAutoTrigger(): void {
  const scraper = getActiveScraper();
  if (!scraper) return;

  const selectors = scraper.getAddToCartSelectors();
  if (selectors.length === 0) return;

  const selectorString = selectors.join(", ");

  const attachListeners = (): void => {
    let buttons: NodeListOf<Element>;
    try {
      buttons = document.querySelectorAll(selectorString);
    } catch {
      return;
    }
    buttons.forEach((button) => {
      if (boundAddToCartButtons.has(button)) return;
      boundAddToCartButtons.add(button);
      (button as HTMLElement).dataset[ADD_TO_CART_LISTENER_FLAG] = "1";
      button.addEventListener("click", handleAddToCartClick, { capture: true });
    });
  };

  attachListeners();

  // E-commerce SPAs swap the DOM as the user navigates between variants;
  // re-scan on subtree mutations so freshly mounted buttons get bound too.
  const observer = new MutationObserver(() => {
    attachListeners();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Cheap periodic safety net in case mutation observer is throttled by the page.
  setInterval(attachListeners, ADD_TO_CART_RESCAN_MS);
}

function handleAddToCartClick(): void {
  // We do NOT preventDefault — the user's add-to-cart action still goes through.
  // SepetIQ opens in parallel so the user can reconsider the decision.
  if (status === "analyzing" || status === "questions") return;
  startAnalysis();
}

function injectFab(): void {
  if (document.getElementById(FAB_HOST_ID)) return;

  const fabHost = document.createElement("div");
  fabHost.id = FAB_HOST_ID;
  fabHost.style.cssText = `all: initial; position: fixed; bottom: 24px; right: 24px; z-index: ${MAX_Z_INDEX}; isolation: isolate; contain: layout style;`;
  document.body.appendChild(fabHost);
  fabHostRef = fabHost;

  const fabShadow = fabHost.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fab-in {
      from { opacity: 0; transform: translateY(12px) scale(0.92); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }
    button {
      min-height: 44px;
      border: 0;
      border-radius: 999px;
      padding: 0 20px;
      background: #6366f1;
      color: white;
      box-shadow: 0 8px 24px rgba(79, 70, 229, 0.40), 0 2px 6px rgba(0,0,0,0.12);
      cursor: pointer;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
      will-change: transform;
      transition: background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
      animation: fab-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    button:hover {
      background: #4f46e5;
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(79, 70, 229, 0.48), 0 2px 8px rgba(0,0,0,0.14);
    }
    button:active { transform: translateY(0) scale(0.97); }
  `;
  fabShadow.appendChild(style);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "SepetIQ ile Kontrol Et";
  button.addEventListener("click", startAnalysis);
  fabShadow.appendChild(button);

  setupFabPositioning();
}

function setupFabPositioning(): void {
  updateFabPosition();

  window.addEventListener("resize", scheduleFabPositionUpdate, { passive: true });
  window.addEventListener("scroll", scheduleFabPositionUpdate, { passive: true });

  const observer = new MutationObserver(scheduleFabPositionUpdate);
  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden"],
  });

  setInterval(scheduleFabPositionUpdate, FAB_POSITION_RESCAN_MS);
}

function scheduleFabPositionUpdate(): void {
  if (fabPositionRaf !== null) return;
  fabPositionRaf = window.requestAnimationFrame(() => {
    fabPositionRaf = null;
    updateFabPosition();
  });
}

function updateFabPosition(): void {
  if (!fabHostRef) return;
  const bottomOffset = getBottomRightReservedSpace() + FAB_EDGE_GAP_PX;
  setStyleIfChanged(fabHostRef, "bottom", `${bottomOffset}px`);
  setStyleIfChanged(fabHostRef, "right", `${FAB_EDGE_GAP_PX}px`);
  setStyleIfChanged(fabHostRef, "zIndex", `${MAX_Z_INDEX}`);
}

function setStyleIfChanged(
  element: HTMLElement,
  property: "bottom" | "right" | "zIndex",
  value: string,
): void {
  if (element.style[property] !== value) {
    element.style[property] = value;
  }
}

function getBottomRightReservedSpace(): number {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scanLeft = Math.max(0, viewportWidth - BOTTOM_RIGHT_SCAN_WIDTH_PX);
  const scanTop = Math.max(0, viewportHeight - BOTTOM_RIGHT_SCAN_HEIGHT_PX);
  let reservedSpace = 0;

  document.querySelectorAll("body *").forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.id === FAB_HOST_ID || element.id === PANEL_HOST_ID) return;
    if (element.closest(`#${FAB_HOST_ID}, #${PANEL_HOST_ID}`)) return;

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      return;
    }
    if (style.position !== "fixed" && style.position !== "sticky") return;

    const rect = element.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    if (rect.width > viewportWidth * 0.9 && rect.height > viewportHeight * 0.7) return;

    const overlapsRight = rect.right > scanLeft && rect.left < viewportWidth;
    const overlapsBottom = rect.bottom > scanTop && rect.top < viewportHeight;
    if (!overlapsRight || !overlapsBottom) return;

    reservedSpace = Math.max(
      reservedSpace,
      Math.max(0, viewportHeight - rect.top + FAB_STACK_GAP_PX),
    );
  });

  return reservedSpace;
}

async function checkGuestLimit(): Promise<boolean> {
  let isLoggedIn = false;
  try {
    const storage = await chrome.storage.local.get(["supabase_user_id", "supabase_token"]);
    isLoggedIn = !!(storage["supabase_user_id"] || storage["supabase_token"]);
  } catch {
    // storage erişimi başarısız → misafir say
  }
  if (isLoggedIn) return true;

  const count = parseInt(localStorage.getItem(GUEST_COUNT_KEY) ?? "0", 10);
  if (count >= GUEST_LIMIT) return false;

  localStorage.setItem(GUEST_COUNT_KEY, String(count + 1));
  return true;
}

function startAnalysis(): void {
  const scraper = getActiveScraper();
  if (!scraper) return;

  void (async () => {
    const allowed = await checkGuestLimit();
    if (!allowed) {
      resetAnalysisState();
      status = "guest_limit";
      renderPanel();
      return;
    }
    _doStartAnalysis(scraper);
  })();
}

function _doStartAnalysis(scraper: ReturnType<typeof getActiveScraper>): void {
  if (!scraper) return;

  clearAnalysisTimers();
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

  safeSendMessage({
    type: MSG.ANALYZE_REQUEST,
    product,
    mode,
  });

  slowTimer = setTimeout(() => {
    isSlowWarning = true;
    renderPanel();
  }, SLOW_THRESHOLD_MS);

  abortTimer = setTimeout(() => {
    clearAnalysisTimers();

    safeSendMessage({ type: MSG.ABORT_ANALYSIS });

    if (hasVerdictEvent()) {
      status = "complete";
      renderPanel();
    } else {
      appendEvent({
        eventType: "error",
        data: { error: "Analiz zaman aşımına uğradı. Tekrar dene." },
      });
      setPanelState("error");
    }
  }, ABORT_THRESHOLD_MS);
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
      const incomingDecisionId =
        typeof payload.decision_id === "string" ? payload.decision_id : undefined;

      if (incomingDecisionId && answeredDecisionIds.has(incomingDecisionId)) {
        renderPanel();
        return false;
      }

      questions = Array.isArray(payload.questions)
        ? (payload.questions as NeedQuestion[])
        : [];
      decisionId = incomingDecisionId;
      status = "questions";
    } else if (eventType === "verdict") {
      clearAnalysisTimers();
      status = "complete";
    } else if (eventType === "done") {
      clearAnalysisTimers();
      if (hasVerdictEvent()) {
        status = "complete";
      } else if (status !== "error") {
        appendEvent({
          eventType: "error",
          data: { error: "Analiz tamamlandı ancak karar skoru alınamadı. Tekrar dene." },
        });
        status = "error";
      }
    } else if (eventType === "error") {
      clearAnalysisTimers();
      status = "error";
    }

    renderPanel();
  }

  if (message.type === MSG.ANALYSIS_ERROR) {
    clearAnalysisTimers();
    const err = (message as AnalysisErrorMsg).error;
    appendEvent({ eventType: "error", data: { error: err } });
    setPanelState("error");
  }

  if (message.type === MSG.ANALYSIS_COMPLETE) {
    clearAnalysisTimers();
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

if (getActiveScraper()) {
  injectFab();
  setupAddToCartAutoTrigger();
}
