"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingBag,
  Plus,
  Calendar,
  Tag,
  TurkishLira,
  Smile,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { UsageFrequency, Satisfaction } from "@/types";

const CATEGORIES = [
  "Elektronik",
  "Giyim",
  "Kozmetik",
  "Ev & Yaşam",
  "Spor",
  "Kitap",
  "Diğer",
];

const FREQUENCIES: { value: UsageFrequency; label: string }[] = [
  { value: "daily", label: "Her Gün" },
  { value: "often", label: "Sık Sık" },
  { value: "sometimes", label: "Ara Sıra" },
  { value: "rarely", label: "Nadiren" },
  { value: "never", label: "Hiç Kullanmadım" },
];

const SATISFACTION: { value: Satisfaction; label: string; icon: string }[] = [
  { value: "satisfied", label: "Memnun", icon: "😊" },
  { value: "neutral", label: "Nötr", icon: "😐" },
  { value: "regretted", label: "Pişman", icon: "😕" },
];

export function PurchaseForm({ onRefresh }: { onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    product_name: "",
    category: "Diğer",
    subcategory: "",
    price: "",
    purchase_date: new Date().toISOString().split("T")[0],
    usage_frequency: "sometimes" as UsageFrequency,
    satisfaction: "satisfied" as Satisfaction,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Handle demo mode or unauth
        console.log("Demo mode: Form submitted", formData);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onRefresh();
        }, 2000);
        return;
      }

      const { error } = await supabase.from("past_purchases").insert({
        user_id: user.id,
        product_name: formData.product_name,
        category: formData.category,
        subcategory: formData.subcategory,
        price: parseFloat(formData.price),
        purchase_date: formData.purchase_date,
        usage_frequency: formData.usage_frequency,
        satisfaction: formData.satisfaction,
        notes: formData.notes,
      });

      if (error) throw error;

      setSuccess(true);
      setFormData({
        product_name: "",
        category: "Diğer",
        subcategory: "",
        price: "",
        purchase_date: new Date().toISOString().split("T")[0],
        usage_frequency: "sometimes",
        satisfaction: "satisfied",
        notes: "",
      });

      setTimeout(() => {
        setSuccess(false);
        onRefresh();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Hata oluştu!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-emerald-100 bg-emerald-50/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5 text-emerald-600" />
          Geçmiş Alışveriş Ekle
        </CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-emerald-600 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="h-12 w-12 mb-2" />
            <p className="font-bold">Başarıyla Kaydedildi!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Ürün Adı
                </label>
                <div className="relative">
                  <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    required
                    placeholder="Örn: AirPods Pro"
                    className="pl-10"
                    value={formData.product_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        product_name: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Fiyat (₺)
                </label>
                <div className="relative">
                  <TurkishLira className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    required
                    type="number"
                    placeholder="0.00"
                    className="pl-10"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Kategori
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <select
                    className="w-full pl-10 h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Alış Tarihi
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    required
                    type="date"
                    className="pl-10"
                    value={formData.purchase_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        purchase_date: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Kullanım Sıklığı
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <select
                    className="w-full pl-10 h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.usage_frequency}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        usage_frequency: e.target.value as UsageFrequency,
                      }))
                    }
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Memnuniyet
                </label>
                <div className="relative">
                  <Smile className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <select
                    className="w-full pl-10 h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.satisfaction}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        satisfaction: e.target.value as Satisfaction,
                      }))
                    }
                  >
                    {SATISFACTION.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Notlar (Opsiyonel)
              </label>
              <textarea
                className="w-full min-h-20 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Bu alımla ilgili görüşlerinizi buraya yazabilirsiniz..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
            >
              {loading ? "Kaydediliyor..." : "Alışverişi Kaydet"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
