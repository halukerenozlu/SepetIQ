"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  Scale,
  Zap,
  Bell,
  Save,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShoppingMode, UserPreference } from "@/types";
import { createClient } from "@/lib/supabase/client";

const MODES: {
  id: ShoppingMode;
  label: string;
  icon: typeof ShieldCheck;
  description: string;
  color: string;
}[] = [
  {
    id: "soft",
    label: "Nazik Rehber",
    icon: ShieldCheck,
    description: "Yumuşak tonla sorgular, ihtiyacınızı netleştirir.",
    color: "emerald",
  },
  {
    id: "balanced",
    label: "Dengeli Hakem",
    icon: Scale,
    description: "İstek, bütçe ve riski aynı masada tartar.",
    color: "sky",
  },
  {
    id: "strict",
    label: "Sıkı Dost",
    icon: Zap,
    description: "Dürtüsel alışverişe daha sert fren koyar.",
    color: "amber",
  },
];

const modeStyles: Record<
  string,
  {
    border: string;
    bg: string;
    ring: string;
    iconBg: string;
    activeIconBg: string;
  }
> = {
  emerald: {
    border: "border-emerald-500",
    bg: "bg-emerald-50/50",
    ring: "ring-emerald-200",
    iconBg: "bg-emerald-500",
    activeIconBg: "bg-emerald-500",
  },
  sky: {
    border: "border-sky-500",
    bg: "bg-sky-50/50",
    ring: "ring-sky-200",
    iconBg: "bg-sky-500",
    activeIconBg: "bg-sky-500",
  },
  amber: {
    border: "border-amber-500",
    bg: "bg-amber-50/50",
    ring: "ring-amber-200",
    iconBg: "bg-amber-500",
    activeIconBg: "bg-amber-500",
  },
};

export default function PreferencesPage({
  initialPrefs,
}: {
  initialPrefs: UserPreference;
}) {
  const [loading, setLoading] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearDone, setClearDone] = useState(false);
  const [clearError, setClearError] = useState("");
  const [success, setSuccess] = useState(false);
  const [prefs, setPrefs] = useState<UserPreference>(initialPrefs);

  const handleSave = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("Demo mode: Preferences saved", prefs);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
        return;
      }

      const { error } = await supabase
        .from("user_preferences")
        .update({
          default_mode: prefs.default_mode,
          monthly_budget: prefs.monthly_budget,
          notifications_enabled: prefs.notifications_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Ayarlar kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    setClearingData(true);
    setClearError("");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setClearError("Verileri silmek için tekrar giriş yapmanız gerekiyor.");
        return;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
      const response = await fetch(`${apiBase}/api/v1/users/me/data`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setPrefs((prev) => ({
        ...prev,
        default_mode: "balanced",
        monthly_budget: 0,
        savings_goal: undefined,
        notifications_enabled: true,
      }));
      setClearDone(true);
    } catch (err) {
      console.error(err);
      setClearError("Veriler silinemedi. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setClearingData(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tercihler</h1>
          <p className="text-muted-foreground">
            SepetIQ&apos;nun size nasıl davranacağını belirleyin.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 shrink-0"
        >
          {loading ? (
            "Kaydediliyor..."
          ) : success ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Kaydedildi
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" /> Değişiklikleri Kaydet
            </span>
          )}
        </Button>
      </div>

      {/* Shopping Mode */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Alışveriş Modu</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {MODES.map((mode) => {
            const isActive = prefs.default_mode === mode.id;
            const style = modeStyles[mode.color];

            return (
              <button
                key={mode.id}
                onClick={() =>
                  setPrefs((prev) => ({ ...prev, default_mode: mode.id }))
                }
                className={cn(
                  "relative flex flex-col items-start p-6 rounded-xl border-2 text-left transition-all outline-none",
                  isActive
                    ? `${style.border} ${style.bg} ring-2 ${style.ring}`
                    : "border-zinc-100 bg-white hover:border-zinc-200",
                )}
              >
                <div
                  className={cn(
                    "mb-4 p-2 rounded-lg",
                    isActive
                      ? `${style.activeIconBg} text-white`
                      : "bg-zinc-100 text-zinc-400",
                  )}
                >
                  <mode.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-zinc-900">{mode.label}</h3>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  {mode.description}
                </p>
                {isActive && (
                  <div
                    className={cn(
                      "absolute top-4 right-4 h-5 w-5 rounded-full flex items-center justify-center text-white",
                      style.activeIconBg,
                    )}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}

        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Aylık Bütçe
            </CardTitle>
            <CardDescription>
              Limitlerinizi belirleyerek kontrolü elinizde tutun.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                type="number"
                min={0}
                className="h-11 text-lg font-bold text-right pr-10"
                placeholder="0"
                value={prefs.monthly_budget || ""}
                onKeyDown={(e) =>
                  ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
                }
                onChange={(e) =>
                  setPrefs((prev) => ({
                    ...prev,
                    monthly_budget: e.target.value === "" ? 0 : (parseFloat(e.target.value) || 0),
                  }))
                }
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-medium">
                ₺
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Bu tutar, bütçe analizlerinde referans olarak kullanılır.
            </p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-zinc-400" />
              Bildirimler
            </CardTitle>
            <CardDescription>
              SepetIQ sizi ne zaman bilgilendirsin?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-zinc-50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Tarayıcı Bildirimleri</p>
                  <span className="text-xs bg-zinc-100 text-zinc-400 border border-zinc-200 px-1.5 py-0.5 rounded font-medium">
                    Yakında
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Kritik durumlarda anlık uyarı al.
                </p>
              </div>
              <button
                disabled
                className="relative h-6 w-11 rounded-full bg-zinc-200 opacity-50 cursor-not-allowed"
              >
                <div className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-200 bg-red-50/40">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-red-900">
            <AlertTriangle className="h-5 w-5" />
            Alışveriş Geçmişini Sıfırla
          </CardTitle>
          <CardDescription className="text-red-800/80">
            Bu işlem hesabınızı silmez. Yalnızca karar geçmişinizi, geçmiş alışverişlerinizi ve kişiselleştirme ayarlarınızı temizler.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setClearConfirmOpen(true);
              setClearDone(false);
              setClearError("");
            }}
            disabled={clearingData}
            className="border-red-300 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
            {clearingData ? "Siliniyor..." : "Alışveriş Geçmişimi Sil"}
          </Button>
        </CardContent>
      </Card>

      {clearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-2xl">
            {clearDone ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Veriler silindi</h3>
                  <p className="mt-2 text-sm text-zinc-600">
                    Alışveriş geçmişiniz ve karar kayıtlarınız temizlendi. Hesabınız korunuyor.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setClearConfirmOpen(false)}
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Tamam
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900">Alışveriş geçmişini sil?</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      Bu işlem hesabınızı silmez. Karar geçmişiniz, geçmiş alışverişleriniz ve kişiselleştirme ayarlarınız silinecek.
                      Hesabınız ve onay bilgileriniz korunacak.
                    </p>
                  </div>
                </div>

                {clearError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                    {clearError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setClearConfirmOpen(false)}
                    disabled={clearingData}
                  >
                    Vazgeç
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClearData}
                    disabled={clearingData}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {clearingData ? "Siliniyor..." : "Sil"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
