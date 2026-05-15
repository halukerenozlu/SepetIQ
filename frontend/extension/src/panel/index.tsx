import { useMemo, useState } from "react";
import type {
  AnalysisMode,
  AnalysisStatus,
  NeedQuestion,
  SSEEvent,
  VerdictData,
} from "../shared/types";

interface DecisionPanelProps {
  events: SSEEvent[];
  status: AnalysisStatus;
  questions?: NeedQuestion[];
  decisionId?: string;
  onAnswerSubmit: (answers: Record<string, string>) => void;
  onRetry: () => void;
  onClose: () => void;
  mode: AnalysisMode;
}

type AgentStatus = "idle" | "running" | "complete";

interface AgentProgress {
  id: string;
  label: string;
  status: AgentStatus;
  durationMs?: number;
  summary?: string;
}

const AGENTS: AgentProgress[] = [
  { id: "product_context", label: "Ürün Analizi", status: "idle" },
  { id: "review_risk", label: "Yorum Analizi", status: "idle" },
  { id: "behavior_profile", label: "Davranış Profili", status: "idle" },
  { id: "budget_guard", label: "Bütçe Kontrolü", status: "idle" },
  { id: "need_analyzer", label: "İhtiyaç Analizi", status: "idle" },
  { id: "verdict", label: "Karar Motoru", status: "idle" },
  { id: "tone_writer", label: "Mesaj Hazırlama", status: "idle" },
];

const MODE_LABELS: Record<AnalysisMode, string> = {
  soft: "Yumuşak Mod",
  balanced: "Dengeli Mod",
  strict: "Disiplinli Mod",
};

const VERDICT_LABELS: Record<string, string> = {
  buy: "Satın Al",
  conditional_buy: "Şartlı Al",
  wait: "Bekle",
  dont_buy: "Vazgeç",
  consider_alternative: "Vazgeç",
};

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeAgentName(value: unknown): string {
  const agent = String(value ?? "");
  return agent === "need_analyzer_second_pass" ? "need_analyzer" : agent;
}

function getProgress(events: SSEEvent[]): AgentProgress[] {
  const progress = AGENTS.map((agent) => ({ ...agent }));

  for (const event of events) {
    if (event.eventType !== "agent_start" && event.eventType !== "agent_complete") {
      continue;
    }

    const data = readObject(event.data);
    const agentId = normalizeAgentName(data.agent);
    const agent = progress.find((item) => item.id === agentId);
    if (!agent) continue;

    if (event.eventType === "agent_start") {
      agent.status = "running";
    } else {
      agent.status = "complete";
      agent.durationMs =
        typeof data.duration_ms === "number" ? data.duration_ms : undefined;
      agent.summary = typeof data.summary === "string" ? data.summary : undefined;
    }
  }

  return progress;
}

function getVerdict(events: SSEEvent[]): VerdictData | null {
  const event = [...events].reverse().find((item) => item.eventType === "verdict");
  if (!event) return null;

  const data = readObject(event.data);
  return {
    verdict: String(data.verdict ?? "wait"),
    score: typeof data.score === "number" ? data.score : 50,
    score_breakdown: readObject(data.score_breakdown) as Record<string, number>,
    headline: String(data.headline ?? "Karar hazır"),
    body: String(data.body ?? ""),
    suggested_action:
      typeof data.suggested_action === "string" ? data.suggested_action : undefined,
  };
}

function getErrorMessage(events: SSEEvent[]): string {
  const event = [...events].reverse().find((item) => item.eventType === "error");
  const data = readObject(event?.data);
  return String(data.error ?? data.message ?? "Analiz sırasında bir hata oluştu.");
}

function getScoreTone(score: number): "danger" | "warning" | "success" {
  if (score <= 35) return "danger";
  if (score <= 60) return "warning";
  return "success";
}

function getQuestionOptions(question: NeedQuestion): string[] {
  if (question.options?.length) return question.options;
  if (question.type === "yes_no") return ["Evet", "Hayır"];
  if (question.type === "scale") return ["1", "2", "3", "4", "5"];
  return [];
}

export function DecisionPanel({
  events,
  status,
  questions = [],
  decisionId: _decisionId,
  onAnswerSubmit,
  onRetry,
  onClose,
  mode,
}: DecisionPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const progress = useMemo(() => getProgress(events), [events]);
  const verdict = useMemo(() => getVerdict(events), [events]);
  const errorMessage = useMemo(() => getErrorMessage(events), [events]);
  const isComplete = status === "complete" && verdict;
  const canSubmit =
    questions.length > 0 && questions.every((question) => answers[question.id]);

  const submitAnswers = () => {
    if (!canSubmit) return;
    onAnswerSubmit(answers);
    setAnswers({});
  };

  return (
    <section className="sepetiq-panel" aria-label="SepetIQ karar paneli">
      <style>{styles}</style>

      <header className="panel-header">
        <div>
          <p className="eyebrow">SepetIQ</p>
          <h1>Satın alma kontrolü</h1>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Kapat">
          ×
        </button>
      </header>

      <div className="mode-row">
        <span className="mode-badge">{MODE_LABELS[mode]}</span>
        <span className="status-text">{getStatusText(status)}</span>
      </div>

      <main className="panel-body">
        {(status === "idle" || status === "analyzing") && (
          <AgentProgressList progress={progress} />
        )}

        {status === "questions" && (
          <QuestionStep
            questions={questions}
            answers={answers}
            canSubmit={canSubmit}
            onSelect={(questionId, value) =>
              setAnswers((current) => ({ ...current, [questionId]: value }))
            }
            onSubmit={submitAnswers}
          />
        )}

        {isComplete && <VerdictStep verdict={verdict} mode={mode} />}

        {status === "error" && (
          <div className="error-state">
            <div className="error-icon">!</div>
            <h2>Analiz tamamlanamadı</h2>
            <p>{errorMessage}</p>
            <button className="primary-button" type="button" onClick={onRetry}>
              Tekrar Dene
            </button>
          </div>
        )}
      </main>
    </section>
  );
}

function AgentProgressList({ progress }: { progress: AgentProgress[] }) {
  return (
    <ol className="agent-list">
      {progress.map((agent) => (
        <li className={`agent-row ${agent.status}`} key={agent.id}>
          <span className="agent-icon" aria-hidden="true">
            {agent.status === "running" ? "" : agent.status === "complete" ? "✓" : ""}
          </span>
          <span className="agent-copy">
            <span className="agent-name">{agent.label}</span>
            {agent.summary && <span className="agent-summary">{agent.summary}</span>}
          </span>
          {agent.durationMs !== undefined && (
            <span className="duration">{formatDuration(agent.durationMs)}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

interface QuestionStepProps {
  questions: NeedQuestion[];
  answers: Record<string, string>;
  canSubmit: boolean;
  onSelect: (questionId: string, value: string) => void;
  onSubmit: () => void;
}

function QuestionStep({
  questions,
  answers,
  canSubmit,
  onSelect,
  onSubmit,
}: QuestionStepProps) {
  return (
    <div className="question-step">
      <div className="section-heading">
        <h2>Birkaç netleştirme sorusu</h2>
        <p>Yanıtların karar skorunu doğrudan etkiler.</p>
      </div>

      <div className="question-list">
        {questions.map((question, index) => (
          <div className="question-block" key={question.id}>
            <p>
              <span>{index + 1}.</span> {question.text}
            </p>
            <div className="option-grid">
              {getQuestionOptions(question).map((option) => (
                <button
                  className={answers[question.id] === option ? "option selected" : "option"}
                  key={option}
                  type="button"
                  onClick={() => onSelect(question.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        className="primary-button"
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        Cevapları Gönder
      </button>
    </div>
  );
}

function VerdictStep({ verdict, mode }: { verdict: VerdictData; mode: AnalysisMode }) {
  const tone = getScoreTone(verdict.score);
  const label = VERDICT_LABELS[verdict.verdict] ?? "Bekle";

  return (
    <div className="verdict-step">
      <div className={`score-circle ${tone}`}>
        <span>{Math.round(verdict.score)}</span>
        <small>skor</small>
      </div>
      <div className="verdict-copy">
        <span className={`verdict-label ${tone}`}>{label}</span>
        <span className="mode-badge compact">{MODE_LABELS[mode]}</span>
        <h2>{verdict.headline}</h2>
        <p>{verdict.body}</p>
        {verdict.suggested_action && (
          <div className="suggested-action">{verdict.suggested_action}</div>
        )}
      </div>
    </div>
  );
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} sn`;
}

function getStatusText(status: AnalysisStatus): string {
  if (status === "questions") return "Cevap bekleniyor";
  if (status === "complete") return "Karar hazır";
  if (status === "error") return "Hata";
  if (status === "idle") return "Hazır";
  return "Analiz sürüyor";
}

const styles = `
  :host, * {
    box-sizing: border-box;
  }

  .sepetiq-panel {
    position: fixed;
    right: 24px;
    top: 50%;
    transform: translateY(-50%);
    width: 360px;
    max-width: calc(100vw - 32px);
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: #ffffff;
    color: #1f2937;
    border: 1px solid rgba(31, 41, 55, 0.08);
    border-radius: 14px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    animation: panel-in 180ms ease-out;
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 18px 0;
  }

  .eyebrow {
    margin: 0 0 3px;
    color: #6366f1;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
  }

  h1, h2, p {
    margin: 0;
  }

  h1 {
    font-size: 18px;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: 0;
  }

  h2 {
    font-size: 16px;
    line-height: 1.25;
    font-weight: 800;
    letter-spacing: 0;
  }

  .icon-button {
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    border: 0;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
    cursor: pointer;
    font-size: 22px;
    line-height: 1;
    transition: background 140ms ease, color 140ms ease, transform 140ms ease;
  }

  .icon-button:hover {
    background: #e5e7eb;
    color: #1f2937;
    transform: scale(1.03);
  }

  .mode-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 18px;
  }

  .mode-badge {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 4px 9px;
    border-radius: 999px;
    background: #eef2ff;
    color: #4338ca;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .mode-badge.compact {
    background: #f9fafb;
    color: #6b7280;
  }

  .status-text {
    color: #6b7280;
    font-size: 12px;
    font-weight: 650;
  }

  .panel-body {
    min-height: 220px;
    overflow-y: auto;
    padding: 0 18px 18px;
  }

  .agent-list {
    list-style: none;
    margin: 0;
    padding: 4px 0 0;
    display: flex;
    flex-direction: column;
  }

  .agent-row {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    min-height: 52px;
    border-bottom: 1px solid #f3f4f6;
  }

  .agent-row:last-child {
    border-bottom: 0;
  }

  .agent-icon {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid #d1d5db;
    color: #6b7280;
    font-size: 13px;
    font-weight: 800;
  }

  .agent-row.running .agent-icon {
    border: 2px solid #e0e7ff;
    border-top-color: #6366f1;
    animation: spin 820ms linear infinite;
  }

  .agent-row.complete .agent-icon {
    background: #22c55e;
    border-color: #22c55e;
    color: white;
  }

  .agent-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .agent-name {
    color: #1f2937;
    font-size: 13px;
    font-weight: 750;
  }

  .agent-summary {
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }

  .duration {
    color: #6b7280;
    font-size: 11px;
    font-weight: 650;
  }

  .question-step {
    display: flex;
    flex-direction: column;
    gap: 14px;
    animation: fade-in 160ms ease-out;
  }

  .section-heading {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-heading p,
  .error-state p,
  .verdict-copy p {
    color: #6b7280;
    font-size: 13px;
    line-height: 1.5;
  }

  .question-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .question-block {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 12px;
    border-radius: 10px;
    background: #f9fafb;
    border: 1px solid #eef2f7;
  }

  .question-block p {
    color: #1f2937;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 650;
  }

  .question-block p span {
    color: #6366f1;
  }

  .option-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .option {
    min-height: 34px;
    padding: 7px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #ffffff;
    color: #1f2937;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    transition: border 140ms ease, background 140ms ease, color 140ms ease;
  }

  .option:hover {
    border-color: #c7d2fe;
    background: #eef2ff;
  }

  .option.selected {
    border-color: #6366f1;
    background: #6366f1;
    color: white;
  }

  .primary-button {
    min-height: 42px;
    width: 100%;
    border: 0;
    border-radius: 10px;
    background: #6366f1;
    color: white;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    transition: background 140ms ease, transform 140ms ease, opacity 140ms ease;
  }

  .primary-button:hover:not(:disabled) {
    background: #4f46e5;
    transform: translateY(-1px);
  }

  .primary-button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .verdict-step {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding-top: 6px;
    animation: fade-in 160ms ease-out;
  }

  .score-circle {
    width: 96px;
    height: 96px;
    flex: 0 0 auto;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 8px solid currentColor;
    background: #ffffff;
  }

  .score-circle span {
    color: #1f2937;
    font-size: 30px;
    font-weight: 900;
    line-height: 1;
  }

  .score-circle small {
    margin-top: 4px;
    color: #6b7280;
    font-size: 11px;
    font-weight: 700;
  }

  .danger { color: #ef4444; }
  .warning { color: #f59e0b; }
  .success { color: #22c55e; }

  .verdict-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .verdict-label {
    font-size: 13px;
    font-weight: 900;
  }

  .verdict-copy h2 {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .suggested-action {
    width: 100%;
    padding: 10px 11px;
    border-radius: 10px;
    background: #f9fafb;
    color: #1f2937;
    font-size: 13px;
    font-weight: 750;
    line-height: 1.4;
  }

  .error-state {
    min-height: 220px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    animation: fade-in 160ms ease-out;
  }

  .error-icon {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #fef2f2;
    color: #ef4444;
    font-size: 24px;
    font-weight: 900;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes panel-in {
    from { opacity: 0; transform: translate(8px, -50%); }
    to { opacity: 1; transform: translate(0, -50%); }
  }
`;

