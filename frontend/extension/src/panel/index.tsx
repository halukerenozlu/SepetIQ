import { useEffect, useMemo, useState } from "react";
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
  isSlowWarning?: boolean;
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

const AGENT_HELP_TEXT: Record<string, string> = {
  product_context: "Ürün bilgileri, fiyat ve kategori okundu.",
  review_risk: "Yorumlarda tekrar eden risk sinyalleri kontrol edildi.",
  behavior_profile: "Satın alma niyeti geçmiş davranışla karşılaştırıldı.",
  budget_guard: "Bütçe ve harcama eşiği kontrol edildi.",
  need_analyzer: "İhtiyacı netleştirmek için kısa sorular hazırlandı.",
  verdict: "Skorlar tek bir karara dönüştürüldü.",
  tone_writer: "Son mesaj anlaşılır hale getiriliyor.",
};

const MODE_LABELS: Record<AnalysisMode, string> = {
  soft: "Nazik Rehber",
  balanced: "Dengeli Hakem",
  strict: "Sıkı Dost",
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
  const rawMessage = String(data.error ?? data.message ?? "");

  if (/ürün bilgisi|product/i.test(rawMessage)) {
    return "Ürün bilgisi alınamadı. Desteklenen bir ürün sayfasında olduğunuzdan emin olun veya sayfayı yenileyip tekrar deneyin.";
  }
  if (/timeout|zaman|uzun/i.test(rawMessage)) {
    return "Analiz beklenenden uzun sürdü. Bağlantınızı ve backend durumunu kontrol edip tekrar deneyin.";
  }
  if (/fetch|network|bağlantı|connection|HTTP 5/i.test(rawMessage)) {
    return "Backend bağlantısı kurulamadı. API sunucusunun çalıştığını kontrol edip tekrar deneyin.";
  }
  if (rawMessage) {
    return rawMessage;
  }

  return "Analiz sırasında bir hata oluştu. Sayfayı yenileyip tekrar deneyin.";
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

function getAgentSummary(agent: AgentProgress): string {
  if (agent.id === "product_context" && agent.summary) {
    return agent.summary;
  }
  return AGENT_HELP_TEXT[agent.id] ?? "Analiz adımı tamamlandı.";
}

export function DecisionPanel({
  events,
  status,
  questions = [],
  isSlowWarning = false,
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
        <button className="icon-button" type="button" onClick={onClose} aria-label="Kapat">x</button>
      </header>

      <div className="mode-row">
        <span className="mode-badge">{MODE_LABELS[mode]}</span>
        <span className="status-text">{getStatusText(status)}</span>
      </div>

      <main className="panel-body">
        {(status === "idle" || status === "analyzing") && (
          <>
            {isSlowWarning && (
              <div className="slow-warning">Analiz derinleştiriliyor. Yorumlar ve ihtiyaç sinyalleri son kez kontrol ediliyor.</div>
            )}
            <AgentProgressList progress={progress} />
          </>
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

        {status === "guest_limit" && <GuestLimitStep />}
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
            {agent.status === "running" ? "" : agent.status === "complete" ? "\u2713" : ""}
          </span>
          <span className="agent-copy">
            <span className="agent-name">{agent.label}</span>
            <span className="agent-summary">{getAgentSummary(agent)}</span>
          </span>
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
  const totalQuestions = Math.max(questions.length, 1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const visibleQuestionNumber = Math.min(currentIndex + 1, totalQuestions);
  const progressPercent = Math.round((visibleQuestionNumber / totalQuestions) * 100);
  const isLastQuestion = visibleQuestionNumber === totalQuestions;

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(questions.length - 1, 0)));
  }, [questions.length]);

  const goNext = () => {
    if (!currentAnswer) return;
    if (isLastQuestion) {
      onSubmit();
      return;
    }
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
  };

  const goBack = () => {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  };

  return (
    <div className="question-step">
      <div className="section-heading">
        <h2>Netleştirme sorusu</h2>
        <p>Her soruyu tek tek yanıtla; skor cevabına göre güncellenecek.</p>
      </div>

      <div
        className="question-progress"
        aria-label={`Soru ilerlemesi ${visibleQuestionNumber}/${totalQuestions}`}
      >
        <div className="progress-copy">
          <span>Soru</span>
          <strong>{visibleQuestionNumber}/{totalQuestions}</strong>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {currentQuestion && (
        <div className="question-list">
          <div className="question-block" key={currentQuestion.id}>
            <p>
              <span>{visibleQuestionNumber}.</span> {currentQuestion.text}
            </p>
            <div className="option-grid">
              {getQuestionOptions(currentQuestion).map((option) => (
                <button
                  className={answers[currentQuestion.id] === option ? "option selected" : "option"}
                  key={option}
                  type="button"
                  onClick={() => onSelect(currentQuestion.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="question-actions">
        <button
          className="secondary-action"
          type="button"
          disabled={currentIndex === 0}
          onClick={goBack}
        >
          Geri
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={isLastQuestion ? !canSubmit : !currentAnswer}
          onClick={goNext}
        >
          {isLastQuestion ? "Cevapları Gönder" : "Sonraki Soru"}
        </button>
      </div>
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

function getStatusText(status: AnalysisStatus): string {
  if (status === "questions") return "Cevap bekleniyor";
  if (status === "complete") return "Karar hazır";
  if (status === "error") return "Hata";
  if (status === "idle") return "Hazır";
  if (status === "guest_limit") return "Limit doldu";
  return "Analiz sürüyor";
}

const DASHBOARD_URL = "http://localhost:3000";

function GuestLimitStep() {
  return (
    <div className="guest-limit-state">
      <div className="guest-limit-icon">!</div>
      <h2>Günlük limit doldu</h2>
      <p>
        Misafir olarak günde <strong>10 ücretsiz analiz</strong> hakkın var.
        Sınırsız kullanım için giriş yap.
      </p>
      <a
        className="primary-button"
        href={`${DASHBOARD_URL}/login`}
        target="_blank"
        rel="noreferrer"
      >
        Giriş Yap - Sınırsız Kullan
      </a>
    </div>
  );
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
    width: 420px;
    max-width: calc(100vw - 32px);
    max-height: calc(100svh - 32px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #ffffff;
    color: #1f2937;
    border: 1px solid rgba(31, 41, 55, 0.08);
    border-radius: 14px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    animation: panel-in 180ms ease-out;
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px 0;
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
    padding: 0 20px;
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
    scrollbar-width: none;
    padding: 0 20px 18px;
  }

  .panel-body::-webkit-scrollbar {
    display: none;
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
    grid-template-columns: 28px minmax(0, 1fr);
    align-items: center;
    gap: 9px;
    min-height: 48px;
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

  .slow-warning {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    margin-bottom: 8px;
    border-radius: 8px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    font-size: 12px;
    font-weight: 700;
    animation: fade-in 200ms ease-out;
  }

  .question-step {
    display: flex;
    flex-direction: column;
    gap: 10px;
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
    line-height: 1.42;
  }

  .question-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .question-progress {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 9px 10px;
    border-radius: 10px;
    background: #eef2ff;
    border: 1px solid #e0e7ff;
  }

  .progress-copy {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #4338ca;
    font-size: 12px;
    font-weight: 800;
  }

  .progress-track {
    height: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: #c7d2fe;
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #6366f1, #22c55e);
    transition: width 240ms ease;
  }

  .question-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #f9fafb;
    border: 1px solid #eef2f7;
  }

  .question-block p {
    color: #1f2937;
    font-size: 13px;
    line-height: 1.4;
    font-weight: 650;
  }

  .question-block p span {
    color: #6366f1;
  }

  .option-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .option {
    min-height: 30px;
    padding: 6px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #ffffff;
    color: #1f2937;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    line-height: 1.25;
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

  .question-actions {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    gap: 8px;
  }

  .secondary-action {
    min-height: 42px;
    width: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #ffffff;
    color: #374151;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    transition: border 140ms ease, background 140ms ease, opacity 140ms ease;
  }

  .secondary-action:hover:not(:disabled) {
    border-color: #c7d2fe;
    background: #eef2ff;
  }

  .secondary-action:disabled {
    cursor: not-allowed;
    opacity: 0.45;
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
    will-change: transform;
    animation: score-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
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

  .guest-limit-state {
    min-height: 220px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
    padding: 8px 0;
    animation: fade-in 160ms ease-out;
  }

  .guest-limit-state p {
    color: #6b7280;
    font-size: 13px;
    line-height: 1.5;
    max-width: 260px;
  }

  .guest-limit-state p strong {
    color: #1f2937;
    font-weight: 800;
  }

  .guest-limit-icon {
    font-size: 32px;
    line-height: 1;
  }

  .guest-limit-state .primary-button {
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    margin-top: 4px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes score-pop {
    from { opacity: 0; transform: scale(0.65); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes panel-in {
    from { opacity: 0; transform: translate(32px, -50%); }
    to { opacity: 1; transform: translate(0, -50%); }
  }
`;



