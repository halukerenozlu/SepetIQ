/**
 * background/index.ts — Service worker
 *
 * Responsibilities:
 *   1. Listen for ANALYZE_REQUEST from content scripts
 *      → POST to /api/v1/decisions/analyze
 *      → Parse SSE stream with fetch + ReadableStream (no EventSource in SW)
 *      → Forward each SSE event to the originating tab
 *   2. Listen for ANSWER_SUBMIT from content scripts
 *      → POST to /api/v1/decisions/{id}/answer
 *
 * NOTE: EventSource is not available in service workers.
 * We use fetch() + response.body.getReader() + TextDecoder.
 */

import { MSG } from "../shared/messages";
import type { ExtensionMessage } from "../shared/messages";

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_API_BASE = "http://localhost:8000";

async function getApiBase(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get("apiBase", (result) => {
      resolve((result["apiBase"] as string | undefined) ?? DEFAULT_API_BASE);
    });
  });
}

// ─── SSE stream parser ────────────────────────────────────────────────────────

/**
 * Streams a text/event-stream response and yields parsed { event, data } pairs.
 * Handles chunked delivery by buffering across chunk boundaries.
 */
async function* parseSseStream(
  response: Response,
): AsyncGenerator<{ event: string; data: string }> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";
  let currentData = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines (split on \n, keep partial last line in buffer)
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const raw of lines) {
        const line = raw.trimEnd(); // strip trailing \r

        if (line === "") {
          // Blank line → dispatch event if we have one
          if (currentEvent) {
            yield { event: currentEvent, data: currentData };
          }
          currentEvent = "";
          currentData = "";
        } else if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          // Append (multiple data: lines are joined with \n per spec)
          currentData = currentData
            ? `${currentData}\n${line.slice(6)}`
            : line.slice(6);
        }
        // Ignore id:, retry:, and comment lines (:)
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Analysis pipeline ────────────────────────────────────────────────────────

async function streamAnalysis(
  tabId: number,
  apiBase: string,
  payload: Record<string, unknown>,
): Promise<void> {
  let response: Response;

  try {
    console.info("[SepetIQ SW] POST /api/v1/decisions/analyze", {
      apiBase,
      tabId,
    });
    response = await fetch(`${apiBase}/api/v1/decisions/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    sendToTab(tabId, {
      type: MSG.ANALYSIS_ERROR,
      error: err instanceof Error ? err.message : "Bağlantı hatası",
    });
    return;
  }

  if (!response.ok) {
    sendToTab(tabId, {
      type: MSG.ANALYSIS_ERROR,
      error: `HTTP ${response.status}: ${response.statusText}`,
    });
    return;
  }

  try {
    for await (const { event, data } of parseSseStream(response)) {
      // Parse JSON data when possible
      let parsed: unknown = data;
      try {
        parsed = JSON.parse(data);
      } catch {
        // keep as raw string
      }

      sendToTab(tabId, {
        type: MSG.SSE_EVENT,
        eventType: event,
        data: parsed,
      });

      // When analysis is complete, also send ANALYSIS_COMPLETE
      if (event === "done") {
        // done event has empty data; full result is in "verdict" event
        // The content script handles verdict event directly for now
        break;
      }
    }
  } catch (err) {
    sendToTab(tabId, {
      type: MSG.ANALYSIS_ERROR,
      error: err instanceof Error ? err.message : "Stream okuma hatası",
    });
  }
}

// ─── Answer submission ────────────────────────────────────────────────────────

async function submitAnswer(
  tabId: number,
  apiBase: string,
  decisionId: string,
  answers: Record<string, string>,
): Promise<void> {
  try {
    const response = await fetch(`${apiBase}/api/v1/decisions/${decisionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (!response.ok) {
      sendToTab(tabId, {
        type: MSG.ANALYSIS_ERROR,
        error: `HTTP ${response.status}: Cevaplar gönderilemedi`,
      });
    }
  } catch (err) {
    sendToTab(tabId, {
      type: MSG.ANALYSIS_ERROR,
      error: err instanceof Error ? err.message : "Cevaplar gönderilemedi",
    });
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function sendToTab(tabId: number, message: unknown): void {
  chrome.tabs.sendMessage(tabId, message).catch(() => {
    // Tab may have closed or navigated away — ignore
  });
}

// ─── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (rawMsg: unknown, sender: chrome.runtime.MessageSender) => {
    console.info("[SepetIQ SW] message received", rawMsg);
    const tabId = sender.tab?.id;
    if (!tabId) return false;

    const message = rawMsg as ExtensionMessage;

    if (message.type === MSG.ANALYZE_REQUEST) {
      const { product, mode } = message;
      getApiBase().then((apiBase) => {
        streamAnalysis(tabId, apiBase, {
          product,
          mode,
          user_id: "anonymous",
        });
      });
      return false;
    }

    if (message.type === MSG.ANSWER_SUBMIT) {
      const { decisionId, answers } = message;
      getApiBase().then((apiBase) => {
        submitAnswer(tabId, apiBase, decisionId, answers);
      });
      return false;
    }

    return false;
  },
);
