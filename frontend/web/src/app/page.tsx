import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Puzzle, BarChart3, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-6 md:px-12">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white text-xs font-black">
            IQ
          </div>
          Sepet<span className="text-emerald-500">IQ</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">Giriş Yap</Link>
        </Button>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            SHACKATHON&apos;26 Projesi
          </div>

          <h1 className="text-5xl font-black tracking-tight text-zinc-900 md:text-6xl">
            Almadan önce{' '}
            <span className="text-emerald-500">sorgula.</span>
          </h1>

          <p className="text-lg text-zinc-500 leading-relaxed">
            SepetIQ, &quot;sepete ekle&quot; butonuna basmadan önce devreye girer.
            Ürünü önermez — almak istediğin ürünü gerçekten alıp almaman gerektiğini sorgular.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-6">
              <Link href="/dashboard" className="flex items-center gap-2">
                Dashboard&apos;a Git <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled
              className="h-12 px-6 gap-2 opacity-60 cursor-not-allowed"
              title="Chrome Web Store linki yakında eklenecek"
            >
              <Puzzle className="h-4 w-4" />
              Eklentiyi Yükle
              <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">Yakında</span>
            </Button>
          </div>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap justify-center gap-4">
          {[
            { icon: ShieldCheck, label: '3 Skor Analizi', desc: 'Product Fit · Review Risk · Need Score' },
            { icon: BarChart3, label: '7 LLM Ajan', desc: 'Cyclic Intelligence akışı' },
            { icon: Puzzle, label: 'Browser Eklentisi', desc: 'Gerçek e-ticaret sayfalarında çalışır' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl border bg-zinc-50 p-4 text-left w-56">
              <div className="mt-0.5 rounded-lg bg-emerald-100 p-2">
                <Icon className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-zinc-400">
        SepetIQ v0.1.0-alpha — Bilinçli alışveriş için tasarlandı.
      </footer>
    </div>
  );
}
