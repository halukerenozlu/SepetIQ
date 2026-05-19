import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { MOCK_DECISIONS } from "@/app/data/dashboardMock";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardMockDecision, AgentTrace, Verdict } from "@/types";

const verdictConfig: Record<
  Verdict,
  { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }
> = {
  buy: {
    label: "AL",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    icon: CheckCircle2,
  },
  conditional_buy: {
    label: "KOŞULLU",
    color: "text-lime-700",
    bgColor: "bg-lime-100",
    icon: CheckCircle2,
  },
  wait: {
    label: "BEKLE",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: Clock,
  },
  dont_buy: {
    label: "VAZGEÇ",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: AlertCircle,
  },
  consider_alternative: {
    label: "ALTERNATİF",
    color: "text-sky-700",
    bgColor: "bg-sky-100",
    icon: RefreshCw,
  },
};

const agentCopy: Record<string, { label: string; description: string }> = {
  product_context: {
    label: "Ürün Bağlamı",
    description: "Ürün adı, fiyat, kategori ve sayfadaki temel bilgiler karar bağlamına çevrildi.",
  },
  review_risk: {
    label: "Yorum Riski",
    description: "Yorumlarda kalite, iade, teslimat ve tekrar eden şikayet sinyalleri arandı.",
  },
  behavior_profile: {
    label: "Davranış Profili",
    description: "Bu satın alma niyeti geçmiş alışveriş davranışıyla karşılaştırıldı.",
  },
  need_analyzer: {
    label: "İhtiyaç Analizi",
    description: "Kullanıcının bu ürüne gerçekten ihtiyaç duyup duymadığı netleştirildi.",
  },
  budget_guard: {
    label: "Bütçe Kontrolü",
    description: "Fiyat, bütçe sınırı ve harcama disiplini açısından kontrol edildi.",
  },
  verdict: {
    label: "Karar Motoru",
    description: "Tüm skorlar tek bir satın alma kararına dönüştürüldü.",
  },
  tone_writer: {
    label: "Mesaj Yazarı",
    description: "Nihai karar kullanıcıya açık ve yargılamayan bir dille yazıldı.",
  },
};

function getAgentCopy(agentName: string) {
  return (
    agentCopy[agentName] ?? {
      label: agentName.replaceAll("_", " "),
      description: "Bu analiz adımı başarıyla tamamlandı.",
    }
  );
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  return (
    <Card className="flex flex-col items-center p-6 text-center">
      <div
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-full border-4 font-bold text-2xl",
          score >= 80
            ? "border-emerald-500 text-emerald-600"
            : score >= 60
              ? "border-lime-500 text-lime-600"
              : score >= 40
                ? "border-amber-500 text-amber-600"
                : "border-red-500 text-red-600",
        )}
      >
        {score}
      </div>
      <div className="mt-2 text-sm font-medium text-zinc-500">{label}</div>
    </Card>
  );
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function readScoreBreakdown(decisionData: Record<string, unknown>): Record<string, unknown> {
  const direct = decisionData.score_breakdown;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    const scoreBreakdown = direct as Record<string, unknown>;
    if (Object.keys(scoreBreakdown).length > 0) {
      return scoreBreakdown;
    }
  }

  const legacy = decisionData.decision_scores;
  const row = Array.isArray(legacy) ? legacy[0] : legacy;
  if (row && typeof row === "object") {
    const scores = row as Record<string, unknown>;
    const productScore = toNumber(scores.product_fit);
    return {
      product_score: productScore,
      need_score: toNumber(scores.need_score),
      budget_score: 50,
      behavior_score: 50,
      review_risk: toNumber(scores.review_risk),
    };
  }

  return {};
}

export default async function DecisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const demoUser = cookieStore.get("sepetiq-demo-user")?.value;

  let decision: DashboardMockDecision | undefined;
  let traces: AgentTrace[] = [];

  if (demoUser) {
    decision = MOCK_DECISIONS.find((d) => d.id === id);
    // Mock traces
    traces = [
      {
        id: "t1",
        decision_id: id,
        agent_name: "product_context",
        cycle_iteration: 1,
        sequence_order: 1,
        started_at: "",
        duration_ms: 450,
        status: "completed",
      },
      {
        id: "t2",
        decision_id: id,
        agent_name: "review_risk",
        cycle_iteration: 1,
        sequence_order: 2,
        started_at: "",
        duration_ms: 1200,
        status: "completed",
      },
      {
        id: "t3",
        decision_id: id,
        agent_name: "behavior_profile",
        cycle_iteration: 1,
        sequence_order: 3,
        started_at: "",
        duration_ms: 300,
        status: "completed",
      },
      {
        id: "t4",
        decision_id: id,
        agent_name: "need_analyzer",
        cycle_iteration: 1,
        sequence_order: 4,
        started_at: "",
        duration_ms: 2500,
        status: "completed",
      },
      {
        id: "t5",
        decision_id: id,
        agent_name: "budget_guard",
        cycle_iteration: 1,
        sequence_order: 5,
        started_at: "",
        duration_ms: 1800,
        status: "completed",
      },
      {
        id: "t6",
        decision_id: id,
        agent_name: "verdict",
        cycle_iteration: 1,
        sequence_order: 6,
        started_at: "",
        duration_ms: 800,
        status: "completed",
      },
      {
        id: "t7",
        decision_id: id,
        agent_name: "tone_writer",
        cycle_iteration: 1,
        sequence_order: 7,
        started_at: "",
        duration_ms: 1500,
        status: "completed",
      },
    ];
  } else {
    const supabase = await createClient();
    const { data: decisionData } = await supabase
      .from("decisions")
      .select("*, decision_scores(*)")
      .eq("id", id)
      .single();

    if (decisionData) {
      const sb = readScoreBreakdown(decisionData as Record<string, unknown>);
      decision = {
        id: decisionData.id,
        user_id: decisionData.user_id,
        product_name: decisionData.product_name,
        product_url: decisionData.product_url || "",
        product_price: decisionData.product_price,
        product_category: decisionData.product_category,
        verdict: decisionData.verdict,
        verdict_message: decisionData.body,
        shopping_mode: decisionData.mode_used,
        need_score: toNumber(sb.need_score),
        budget_score: toNumber(sb.budget_score),
        product_score: toNumber(sb.product_score),
        total_score: toNumber(decisionData.confidence ?? sb.behavior_score),
        is_cyclic_recheck: decisionData.total_cycles > 1,
        created_at: decisionData.created_at,
      };
    }

    const { data: traceData } = await supabase
      .from("agent_traces")
      .select("*")
      .eq("decision_id", id)
      .order("sequence_order", { ascending: true });

    traces = traceData || [];
  }

  if (!decision) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold">Karar bulunamadı</h2>
        <Button asChild className="mt-4">
          <Link href="/dashboard/history">Geri Dön</Link>
        </Button>
      </div>
    );
  }

  const V = verdictConfig[decision.verdict];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <Link
        href="/dashboard/history"
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Karar Geçmişine Dön
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-2xl border shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-bold">
              {decision.product_category}
            </Badge>
            <span className="text-sm text-zinc-400">
              {new Date(decision.created_at).toLocaleString("tr-TR")}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            {decision.product_name}
          </h1>
          <div className="text-2xl font-bold text-emerald-600">
            {decision.product_price.toLocaleString("tr-TR")} ₺
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col items-center justify-center px-10 py-6 rounded-2xl border-2 gap-2",
            V.bgColor,
            V.color.replace("text-", "border-").replace("700", "300"),
          )}
        >
          <V.icon className="h-10 w-10" />
          <div className="text-2xl font-black tracking-widest">{V.label}</div>
        </div>
      </div>

      {/* Scores */}
      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCircle score={decision.need_score} label="İhtiyaç Skoru" />
        <ScoreCircle score={decision.budget_score} label="Bütçe Skoru" />
        <ScoreCircle score={decision.product_score} label="Ürün Skoru" />
      </div>

      {/* Verdict Message */}
      <Card className="border-emerald-100 bg-emerald-50/20">
        <CardContent className="p-8">
          <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5" /> SepetIQ Analizi
          </h3>
          <p className="text-xl font-medium text-emerald-800 leading-relaxed italic">
            &ldquo;{decision.verdict_message}&rdquo;
          </p>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" className="bg-white" asChild>
              <a
                href={decision.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                Ürüne Git <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agent Traces */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Ajan Analiz Akışı</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Kararın hangi kontrollerden geçtiğini adım adım gösterir.
          </p>
        </div>
        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-zinc-200 before:to-transparent">
          {traces.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-6 text-sm text-zinc-500">
                Bu karar için ajan akışı kaydı bulunamadı.
              </CardContent>
            </Card>
          ) : (
            traces.map((trace) => {
              const copy = getAgentCopy(trace.agent_name);

              return (
                <div
                  key={trace.id}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  {/* Icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-zinc-100 group-[.is-active]:bg-emerald-500 text-zinc-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <Cpu className="h-5 w-5" />
                  </div>
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-white shadow-sm transition-all group-hover:border-emerald-200">
                    <div className="flex items-center justify-between mb-1 gap-3">
                      <div className="font-bold text-zinc-900 text-sm">
                        {copy.label}
                      </div>
                      <time className="shrink-0 text-xs text-zinc-400 font-mono">
                        {trace.duration_ms}ms
                      </time>
                    </div>
                    <div className="text-zinc-500 text-sm leading-relaxed">
                      {copy.description}
                    </div>
                    <div className="mt-2 text-xs font-medium text-zinc-400">
                      Döngü {trace.cycle_iteration} · Sıra {trace.sequence_order}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
