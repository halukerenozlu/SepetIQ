/**
 * shared/messages.ts — Chrome extension message type constants + typed helpers
 *
 * Message flow:
 *   Content → Background : ANALYZE_REQUEST, ANSWER_SUBMIT
 *   Background → Content : SSE_EVENT, ANALYSIS_ERROR, ANALYSIS_COMPLETE
 */

import type {
  ScrapedProduct,
  AnalysisMode,
  DecisionResult,
} from "./types";

// ─── Message type constants ────────────────────────────────────────────────────

export const MSG = {
  // Content → Background
  ANALYZE_REQUEST: "ANALYZE_REQUEST",
  ANSWER_SUBMIT: "ANSWER_SUBMIT",
  ABORT_ANALYSIS: "ABORT_ANALYSIS",
  // Background → Content
  SSE_EVENT: "SSE_EVENT",
  ANALYSIS_ERROR: "ANALYSIS_ERROR",
  ANALYSIS_COMPLETE: "ANALYSIS_COMPLETE",
} as const;

// ─── Typed message interfaces ──────────────────────────────────────────────────

/** Sent by content script to start an analysis. */
export interface AnalyzeRequestMsg {
  type: typeof MSG.ANALYZE_REQUEST;
  product: ScrapedProduct;
  mode: AnalysisMode;
}

/** Sent by content script with user answers to Need Analyzer questions. */
export interface AnswerSubmitMsg {
  type: typeof MSG.ANSWER_SUBMIT;
  decisionId: string;
  answers: Record<string, string>;
}

/** Sent by content script to abort an in-progress analysis stream. */
export interface AbortAnalysisMsg {
  type: typeof MSG.ABORT_ANALYSIS;
}

/** SSE event forwarded from background to content script. */
export interface SseEventMsg {
  type: typeof MSG.SSE_EVENT;
  eventType: string;
  data: unknown;
}

/** Sent by background when the analysis pipeline encounters an error. */
export interface AnalysisErrorMsg {
  type: typeof MSG.ANALYSIS_ERROR;
  error: string;
}

/** Sent by background when the analysis is fully complete. */
export interface AnalysisCompleteMsg {
  type: typeof MSG.ANALYSIS_COMPLETE;
  result: DecisionResult;
}

/** Discriminated union of all extension messages. */
export type ExtensionMessage =
  | AnalyzeRequestMsg
  | AnswerSubmitMsg
  | AbortAnalysisMsg
  | SseEventMsg
  | AnalysisErrorMsg
  | AnalysisCompleteMsg;
