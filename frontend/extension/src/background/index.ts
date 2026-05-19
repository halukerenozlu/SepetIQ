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

const DEFAULT_API_BASE = "https://sepetiq-production.up.railway.app";
const DASHBOARD_ORIGIN = "http://localhost:3000";
const SUPABASE_COOKIE_RE = /^sb-.+-auth-token(?:\.\d+)?$/;

const activeAnalysis = new Map<number, AbortController>();

interface ExtensionAuthSession {
  accessToken: string | null;
  userId: string | null;
}

async function getApiBase(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get("apiBase", (result) => {
      resolve((result["apiBase"] as string | undefined) ?? DEFAULT_API_BASE);
    });
  });
}

async function getStoredSupabaseToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get("supabase_token", (result) => {
      const token = result["supabase_token"];
      resolve(typeof token === "string" && token.length > 0 ? token : null);
    });
  });
}

async function getBackendHeaders(
  authSession: ExtensionAuthSession,
): Promise<Record<string, string>> {
  const supabaseToken =
    (await getStoredSupabaseToken()) ?? authSession.accessToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (supabaseToken) {
    headers.Authorization = `Bearer ${supabaseToken}`;
  }

  return headers;
}

async function getExtensionAuthSession(): Promise<ExtensionAuthSession> {
  return (
    (await getSessionFromChromeStorage()) ??
    (await getSessionFromDashboardCookie()) ?? {
      accessToken: null,
      userId: null,
    }
  );
}

async function getSessionFromChromeStorage(): Promise<ExtensionAuthSession | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const storedUserId =
        typeof items["supabase_user_id"] === "string"
          ? items["supabase_user_id"]
          : null;
      const storedToken =
        typeof items["supabase_token"] === "string"
          ? items["supabase_token"]
          : null;

      if (storedUserId || storedToken) {
        resolve({
          accessToken: storedToken,
          userId: storedUserId ?? extractUserIdFromJwt(storedToken),
        });
        return;
      }

      const entries = Object.entries(items);
      const likelyEntries = entries.filter(([key]) =>
        isLikelySupabaseSessionKey(key),
      );

      const likelySession = findSessionInEntries(likelyEntries);
      if (likelySession) {
        resolve(likelySession);
        return;
      }

      resolve(findSessionInEntries(entries));
    });
  });
}

async function getSessionFromDashboardCookie(): Promise<ExtensionAuthSession | null> {
  return new Promise((resolve) => {
    chrome.cookies.getAll({ url: DASHBOARD_ORIGIN }, (cookies) => {
      const authCookies = cookies.filter((cookie) =>
        SUPABASE_COOKIE_RE.test(cookie.name),
      );

      const directCookie = authCookies.find((cookie) =>
        cookie.name.endsWith("-auth-token"),
      );
      if (directCookie) {
        const session = extractAuthSession(directCookie.value);
        if (session.userId || session.accessToken) {
          resolve(session);
          return;
        }
      }

      const chunkedValue = authCookies
        .filter((cookie) => /\.\d+$/.test(cookie.name))
        .sort((a, b) => cookieChunkIndex(a.name) - cookieChunkIndex(b.name))
        .map((cookie) => cookie.value)
        .join("");

      resolve(chunkedValue ? extractAuthSession(chunkedValue) : null);
    });
  });
}

function findSessionInEntries(
  entries: Array<[string, unknown]>,
): ExtensionAuthSession | null {
  for (const [, value] of entries) {
    const session = extractAuthSession(value);
    if (session.userId || session.accessToken) {
      return session;
    }
  }

  return null;
}

function isLikelySupabaseSessionKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized.includes("supabase") || SUPABASE_COOKIE_RE.test(key);
}

function cookieChunkIndex(name: string): number {
  const match = name.match(/\.(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function extractAuthSession(value: unknown): ExtensionAuthSession {
  const session = extractSessionObject(value);
  const directToken =
    typeof session === "string" && isJwtLike(session) ? session : null;
  const accessToken = findStringField(session, "access_token") ?? directToken;
  const userId = findUserId(session) ?? extractUserIdFromJwt(accessToken);

  return {
    accessToken,
    userId,
  };
}

function isJwtLike(value: string): boolean {
  return value.split(".").length === 3;
}

function extractSessionObject(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const decoded = decodeCookieValue(value);
  return parseJson(decoded) ?? parseJson(value) ?? decoded;
}

function decodeCookieValue(value: string): string {
  const decodedUri = safeDecodeURIComponent(value);
  const raw = decodedUri.startsWith("base64-")
    ? decodedUri.slice("base64-".length)
    : decodedUri;

  if (decodedUri.startsWith("base64-")) {
    return safeBase64Decode(raw) ?? decodedUri;
  }

  return decodedUri;
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function safeBase64Decode(value: string): string | null {
  try {
    return atob(value);
  } catch {
    return null;
  }
}

function extractUserIdFromJwt(token: string | null): string | null {
  if (!token) return null;

  const [, payload] = token.split(".");
  if (!payload) return null;

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const parsed = parseJson(safeBase64Decode(padded) ?? "");

  if (isRecord(parsed) && typeof parsed.sub === "string") {
    return parsed.sub;
  }

  return null;
}

function findUserId(value: unknown): string | null {
  if (!isRecord(value)) return null;

  const user = value.user;
  if (isRecord(user) && typeof user.id === "string") {
    return user.id;
  }

  const session = value.session ?? value.currentSession;
  if (session) return findUserId(session);

  return null;
}

function findStringField(value: unknown, field: string): string | null {
  if (!isRecord(value)) return null;

  if (typeof value[field] === "string") {
    return value[field];
  }

  for (const nested of Object.values(value)) {
    const found = findStringField(nested, field);
    if (found) return found;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
  authSession: ExtensionAuthSession,
): Promise<void> {
  const controller = new AbortController();
  activeAnalysis.set(tabId, controller);

  let response: Response;
  const headers = await getBackendHeaders(authSession);

  startKeepalive();

  try {
    console.info("[SepetIQ SW] POST /api/v1/decisions/analyze", {
      apiBase,
      tabId,
      userId: authSession.userId ?? "anonymous",
    });
    response = await fetch(`${apiBase}/api/v1/decisions/analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    activeAnalysis.delete(tabId);
    stopKeepalive();
    if (err instanceof Error && err.name === "AbortError") return;
    sendToTab(tabId, {
      type: MSG.ANALYSIS_ERROR,
      error: err instanceof Error ? err.message : "Bağlantı hatası",
    });
    return;
  }

  if (!response.ok) {
    activeAnalysis.delete(tabId);
    stopKeepalive();
    sendToTab(tabId, {
      type: MSG.ANALYSIS_ERROR,
      error: `HTTP ${response.status}: ${response.statusText}`,
    });
    return;
  }

  try {
    for await (const { event, data } of parseSseStream(response)) {
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

      if (event === "done") {
        break;
      }
    }
  } catch (err) {
    if (!(err instanceof Error && err.name === "AbortError")) {
      sendToTab(tabId, {
        type: MSG.ANALYSIS_ERROR,
        error: err instanceof Error ? err.message : "Stream okuma hatası",
      });
    }
  } finally {
    activeAnalysis.delete(tabId);
    stopKeepalive();
  }
}

// ─── Answer submission ────────────────────────────────────────────────────────

async function submitAnswer(
  tabId: number,
  apiBase: string,
  decisionId: string,
  answers: Record<string, string>,
  authSession: ExtensionAuthSession,
): Promise<void> {
  const headers = await getBackendHeaders(authSession);

  try {
    const response = await fetch(
      `${apiBase}/api/v1/decisions/${decisionId}/answer`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ answers }),
      },
    );
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

// ─── Service worker keepalive ─────────────────────────────────────────────────
// MV3 service workers are killed after ~30s of inactivity. We use a repeating
// alarm to keep the SW alive during long SSE streams.

let activeStreams = 0;

function startKeepalive(): void {
  if (activeStreams === 0) {
    chrome.alarms.create("sepetiq-keepalive", { periodInMinutes: 0.4 });
  }
  activeStreams++;
}

function stopKeepalive(): void {
  activeStreams = Math.max(0, activeStreams - 1);
  if (activeStreams === 0) {
    chrome.alarms.clear("sepetiq-keepalive");
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sepetiq-keepalive") {
    // no-op ping — just wakes the SW
  }
});

// ─── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (rawMsg: unknown, sender: chrome.runtime.MessageSender) => {
    console.info("[SepetIQ SW] message received", rawMsg);
    const tabId = sender.tab?.id;
    if (!tabId) return false;

    const message = rawMsg as ExtensionMessage;

    if (message.type === MSG.ANALYZE_REQUEST) {
      const { product, mode } = message;
      Promise.all([getApiBase(), getExtensionAuthSession()]).then(
        ([apiBase, authSession]) => {
          streamAnalysis(
            tabId,
            apiBase,
            {
              product,
              mode,
              user_id: authSession.userId ?? "anonymous",
            },
            authSession,
          );
        },
      );
      return false;
    }

    if (message.type === MSG.ANSWER_SUBMIT) {
      const { decisionId, answers } = message;
      Promise.all([getApiBase(), getExtensionAuthSession()]).then(
        ([apiBase, authSession]) => {
          submitAnswer(tabId, apiBase, decisionId, answers, authSession);
        },
      );
      return false;
    }

    if (message.type === MSG.ABORT_ANALYSIS) {
      const controller = activeAnalysis.get(tabId);
      if (controller) {
        controller.abort();
        activeAnalysis.delete(tabId);
      }
      return false;
    }

    return false;
  },
);
