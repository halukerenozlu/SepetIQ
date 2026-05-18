/**
 * content/auth-bridge.ts — Dashboard session bridge
 *
 * Loaded only on the dashboard origin (localhost:3000). Listens for
 * SEPETIQ_SUPABASE_SESSION postMessages from the dashboard page and
 * mirrors the Supabase session into chrome.storage.local so the background
 * service worker can attach a bearer token to /analyze requests.
 *
 * No UI is injected here — the FAB and analysis flow live in content/index.ts
 * and only load on shopping product pages.
 */

const DASHBOARD_ORIGIN = "http://localhost:3000";
const EXTENSION_SESSION_MESSAGE = "SEPETIQ_SUPABASE_SESSION";

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

window.addEventListener("message", (event: MessageEvent) => {
  if (
    window.location.origin !== DASHBOARD_ORIGIN ||
    event.origin !== DASHBOARD_ORIGIN ||
    event.source !== window
  ) {
    return;
  }

  const data = readObject(event.data);
  if (data.type !== EXTENSION_SESSION_MESSAGE) return;

  const userId = typeof data.userId === "string" ? data.userId : null;
  const token = typeof data.accessToken === "string" ? data.accessToken : null;

  if (userId && token) {
    chrome.storage.local.set({
      supabase_user_id: userId,
      supabase_token: token,
    });
    return;
  }

  chrome.storage.local.remove(["supabase_user_id", "supabase_token"]);
});
