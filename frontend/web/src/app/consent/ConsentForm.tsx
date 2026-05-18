'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { acceptConsent, declineConsent } from './actions';

export function ConsentForm() {
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<'accept' | 'decline' | null>(null);

  const handleAccept = () => {
    setAction('accept');
    startTransition(() => acceptConsent(analyticsConsent));
  };

  const handleDecline = () => {
    setAction('decline');
    startTransition(() => declineConsent());
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KVKK metni */}
      <div className="max-h-64 overflow-y-auto rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-600 leading-relaxed">
        <p className="font-semibold text-zinc-800 mb-2">Kişisel Verilerin Korunması Hakkında Aydınlatma Metni</p>
        <p className="mb-3">
          SepetIQ olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında
          kişisel verilerinizi işlemekteyiz.
        </p>
        <p className="font-medium text-zinc-700 mb-1">İşlenen Veriler</p>
        <p className="mb-3">
          Google hesabınızdan alınan ad, e-posta ve profil fotoğrafı; uygulama içinde
          girdiğiniz geçmiş alışveriş bilgileri ve alışveriş kararlarınız.
        </p>
        <p className="font-medium text-zinc-700 mb-1">İşleme Amaçları</p>
        <p className="mb-3">
          Alışveriş kararlarınızı analiz etmek, kişiselleştirilmiş içgörüler sunmak ve
          hizmet kalitesini artırmak.
        </p>
        <p className="font-medium text-zinc-700 mb-1">Haklarınız</p>
        <p>
          Verilerinize erişme, düzeltme, silme ve işlemeyi kısıtlama haklarına sahipsiniz.
          Hesap silme işlemi Tercihler sayfasından yapılabilir.
        </p>
      </div>

      {/* Analytics consent (opsiyonel) */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={analyticsConsent}
          onChange={(e) => setAnalyticsConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-emerald-500"
        />
        <span className="text-sm text-zinc-600">
          Ürün geliştirme amacıyla anonim kullanım verilerimin toplanmasına izin veriyorum.{' '}
          <span className="text-zinc-400">(opsiyonel)</span>
        </span>
      </label>

      {/* Butonlar */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleAccept}
          disabled={isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isPending && action === 'accept' ? 'Kaydediliyor...' : 'Kabul Et ve Devam Et'}
        </Button>
        <Button
          variant="ghost"
          onClick={handleDecline}
          disabled={isPending}
          className="w-full text-zinc-500 hover:text-zinc-700"
        >
          {isPending && action === 'decline' ? 'Çıkış yapılıyor...' : 'Kabul Etmiyorum'}
        </Button>
      </div>
    </div>
  );
}
