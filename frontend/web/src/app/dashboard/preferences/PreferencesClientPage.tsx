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
    label: "Soft (Yumuşak)",
    icon: ShieldCheck,
    description: "Dengeli değerlendirme, önerilere açık, huzurlu harcama.",
    color: "emerald",
  },
  {
    id: "balanced",
    label: "Balanced (Dengeli)",
    icon: Scale,
    description: "Standart analiz, nötr ton, mantıklı sınırlar.",
    color: "sky",
  },
  {
    id: "strict",
    label: "Strict (Sıkı)",
    icon: Zap,
    description: "Sert sorgucu, harcama minimalist, tasarruf odaklı.",
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
      alert("Ayarlar kaydedilirken hata oluştu!");
    } finally {
      setLoading(false);
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
                className="h-11 text-lg font-bold"
                placeholder="0"
                value={prefs.monthly_budget ?? ""}
                onChange={(e) =>
                  setPrefs((prev) => ({
                    ...prev,
                    monthly_budget: e.target.value === "" ? 0 : (parseFloat(e.target.value) || 0),
                  }))
                }
              />
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
                <p className="text-sm font-medium">Tarayıcı Bildirimleri</p>
                <p className="text-xs text-zinc-500">
                  Kritik durumlarda anlık uyarı al.
                </p>
              </div>
              <button
                onClick={() =>
                  setPrefs((prev) => ({
                    ...prev,
                    notifications_enabled: !prev.notifications_enabled,
                  }))
                }
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  prefs.notifications_enabled
                    ? "bg-emerald-500"
                    : "bg-zinc-200",
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform",
                    prefs.notifications_enabled
                      ? "translate-x-5"
                      : "translate-x-0",
                  )}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
