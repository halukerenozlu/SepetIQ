# WEB.md — Companion Web Mimarisi

> Next.js 16 + React + TypeScript + Tailwind + shadcn/ui ile yapılmış companion (eşlik eden) web sitesi.

---

## 1. Amaç

Companion Web, **derin analiz katmanı** olarak çalışır:

- Kullanıcı kayıt / giriş (Google OAuth)
- Profil ve tercih yönetimi
- Geçmiş kararların görüntülenmesi
- Tasarruf istatistikleri ve dashboard
- Sahte e-ticaret demo sayfası (hackathon için)
- Landing page (tanıtım sayfası)

Eklenti **hızlı katman**, web **derin katman**. İki katman aynı backend'i kullanır.

---

## 2. Sayfa Haritası

```
/                           → Landing page (anonim erişim)
/login                      → Google OAuth
/auth/callback              → OAuth dönüşü
/dashboard                  → Ana panel (auth gerekli)
/dashboard/history          → Geçmiş kararlar
/dashboard/purchases        → Geçmiş alışverişler (manuel ekleme)
/dashboard/stats            → Tasarruf istatistikleri
/dashboard/preferences      → Profil ve mod ayarları
/decisions/[id]             → Tek bir karar detayı (agent trace dahil)

/product/[id]               → DEMO: sahte e-ticaret ürün sayfası
                              (eklenti bu sayfada da çalışır)

/install                    → Eklenti kurulum rehberi
/about                      → Proje hakkında
```

---

## 3. Proje Yapısı

```
web/
├── package.json
├── pnpm-lock.yaml
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json         # shadcn/ui config
│
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Landing
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── auth/callback/
│   │   │       └── route.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── history/
│   │   │   ├── purchases/
│   │   │   ├── stats/
│   │   │   └── preferences/
│   │   │
│   │   ├── decisions/[id]/
│   │   │   └── page.tsx
│   │   │
│   │   └── product/[id]/   # DEMO sayfası
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── demo/           # Demo ürün sayfası components
│   │   └── shared/         # Layout, header, footer
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts   # Browser client
│   │   │   ├── server.ts   # Server client
│   │   │   └── middleware.ts
│   │   ├── api.ts          # Backend API client
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── useUser.ts
│   │   ├── useDecisions.ts
│   │   └── useStats.ts
│   │
│   └── types/
│       └── index.ts
│
└── public/
    ├── images/
    └── icons/
```

---

## 4. Sayfa Detayları

### 4.1 Landing Page (`/`)

**Amaç:** Yeni ziyaretçileri ikna et, eklentiyi kurmaya yönlendir.

**Yapı:**
- Hero section: pitch cümlesi + ana CTA ("Eklentiyi Kur")
- Problem statement: e-ticaret manipülasyonu
- Solution: SepetIQ ne yapar
- 3 demo senaryosu (görsel kart formatında)
- "Friction by Design" felsefesi
- Final CTA

**Önemli:** Hackathon demo'sunda jüri ilk olarak burayı görebilir. **Bu sayfa profesyonel görünmeli.**

---

### 4.2 Login (`/login`)

```typescript
// src/app/(auth)/login/page.tsx

'use client';

import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
    const supabase = createClient();
    
    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Card>
                <CardHeader>
                    <SepetIQLogo />
                    <h1>SepetIQ'ya Hoşgeldin</h1>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGoogleLogin}>
                        <GoogleIcon />
                        Google ile Devam Et
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
```

---

### 4.3 Dashboard (`/dashboard`)

**Amaç:** Kullanıcının ana karar panosu.

**Yapı:**
- Üst karşılama: "Merhaba [İsim], bu hafta 1.250 TL tasarruf ettin"
- 4 stat card (özet):
  - Toplam karar sayısı
  - Bu ay tasarruf
  - Karar takip oranı
  - Disiplinli mod kullanım oranı
- Son 5 karar (preview kartlar)
- "Eklenti kurulu mu?" check + kurulum rehberi linki
- Quick actions: "Geçmiş alışveriş ekle", "Tercihleri güncelle"

```typescript
// src/app/dashboard/page.tsx

import { Suspense } from 'react';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { RecentDecisions } from '@/components/dashboard/RecentDecisions';

export default async function DashboardPage() {
    return (
        <div className="space-y-6">
            <WelcomeHeader />
            
            <Suspense fallback={<StatsLoading />}>
                <StatsOverview />
            </Suspense>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentDecisions />
                <ExtensionStatus />
            </div>
            
            <QuickActions />
        </div>
    );
}
```

---

### 4.4 History (`/dashboard/history`)

Geçmiş kararlar listesi. Filtreleme, arama.

**Filtreler:**
- Verdict (Al / Bekle / Alma vb.)
- Tarih aralığı
- Mode (Yumuşak / Dengeli / Disiplinli)
- Kullanıcı eylemi (Takip edildi / Yoksayıldı)

Her karar bir kart olarak:
```
┌─────────────────────────────────────┐
│ Apple Watch Series 10        ⚠ Bekle│
│ 18.999 TL | 2 gün önce              │
│ Fit: 78 | Risk: 65 | Need: 32       │
│ "Geçmişte benzer ürün kullanılmamış"│
│ Eylem: Takip ettin → 18.999 TL tas. │
└─────────────────────────────────────┘
```

Karta tıklayınca `/decisions/[id]` sayfasına gider — full agent trace.

---

### 4.5 Purchases (`/dashboard/purchases`)

Kullanıcı geçmiş alışverişlerini manuel ekleyebilir (KILLER FEATURE için kritik).

**Form Alanları:**
- Ürün adı (text)
- Kategori (dropdown: Elektronik, Kozmetik, vb.)
- Fiyat (number)
- Satın alma tarihi (date)
- Kullanım sıklığı (slider: Hiç → Her gün)
- Memnuniyet (3 emoji: 😔 Pişmanım, 😐 Nötr, 😊 Memnunum)
- Notlar (opsiyonel)

**Liste görünümü:**
```
Geçmiş Alışverişlerim (23 ürün)

[+ Yeni Ekle]

┌──────────────────────────────────────────────────┐
│ Samsung Galaxy Watch 5                           │
│ Elektronik · 8.500 TL · 6 ay önce                │
│ Kullanım: Nadiren ⚠  Memnuniyet: 😔 Pişmanım    │
│                                            [Düzenle]│
└──────────────────────────────────────────────────┘
```

---

### 4.6 Stats (`/dashboard/stats`)

Görsel zenginleştirilmiş istatistik sayfası.

**Grafikler (recharts kullanılır):**
- Aylık tasarruf (bar chart)
- Karar dağılımı (pie chart - Al/Bekle/Alma)
- Mod kullanım oranı (donut chart)
- Tetikleyici analizi (en çok hangi sebepler "Bekle" kararı verdirdi)

**Behavioral Insights (LLM ile üretilen):**
- "En çok gece (22-02) alışveriş yapmaya çalışıyorsun"
- "İndirim baskısı en güçlü tetikleyicin"
- "Disiplinli mod kararlarına %91 oranında uyuyorsun"

**Önemli demo unsuru:** Bu sayfa jüri için **çok etkileyici.** Görsel grafikler ve içgörüler güçlü.

---

### 4.7 Decision Detail (`/decisions/[id]`)

Tek bir kararın tam görünümü. **Hackathon demo'sunda kritik.**

**Yapı:**
- Üst: Karar başlığı + verdict + ürün bilgisi
- Skor kartı (3 skor, renkli)
- Tone output (headline + body)
- Suggested action
- **Agent trace tam görünüm** — her ajanın ne yaptığı, süresi, çıktısı
- Cycle bilgisi (kaç döngü çalıştı, neden tetiklendi)
- Soru-cevap geçmişi
- Kullanıcı eylemi butonu ("Bu karara uydum" / "Yoksaydım")

**Agent Trace Görünümü:**
```
┌────────────────────────────────────────────────┐
│ Karar Akışı                          9.45 sn   │
├────────────────────────────────────────────────┤
│ ✓ Product Context Agent           1.24 sn      │
│   "Premium segment akıllı saat, su geçirmez"   │
│                                                │
│ ✓ Review Risk Analyzer            2.31 sn      │
│   "23 yorum analiz edildi"                     │
│   ⚠ Risk tetiklendi: pil ömrü                  │
│                                                │
│ ✓ Behavior Profile Agent          1.85 sn      │
│   "Profile: impulsive + discount_driven"       │
│   🔥 Benzer ürün: 6 ay önce, kullanılmamış     │
│                                                │
│ ✓ Need Analyzer Agent (Cycle 1)   1.40 sn      │
│ ✓ Need Check Agent (Cycle 1)      1.15 sn      │
│                                                │
│ ↻ CYCLIC FLOW TETİKLENDİ                       │
│   Sebep: high_severity_risk + impulsive profile│
│                                                │
│ ✓ Need Analyzer Agent (Cycle 2)   1.20 sn      │
│ ✓ Need Check Agent (Cycle 2)      0.95 sn      │
│ ✓ Decision Agent                  0.30 sn      │
│ ✓ Tone Adapter Agent              0.95 sn      │
└────────────────────────────────────────────────┘
```

---

### 4.8 Preferences (`/dashboard/preferences`)

**Bölümler:**
- Profil bilgileri (Ad, avatar — Google'dan gelir)
- Varsayılan mod seçimi
- Aylık bütçe (opsiyonel)
- Tasarruf hedefi (opsiyonel)
- Bildirim ayarları
- Timezone (zaman dilimi)
- "Hesabı sil" (DSGVO/KVKK uyumu için)

---

### 4.9 Demo Product Page (`/product/[id]`)

**Bu sayfa hackathon demo'sunun yıldızı.**

Görsel olarak Trendyol/Hepsiburada'ya **çok benzer** bir sahte ürün sayfası. Eklenti bu sayfada da çalışacak şekilde manifest'e eklenmiş.

**Yapı:**
- Üst: Trendyol benzeri header
- Ürün galerisi (sol)
- Ürün detayları (sağ): isim, fiyat, "Sepete Ekle" butonu
- Teknik özellikler tablosu
- Yorumlar bölümü (15+ mock yorum)
- "Benzer ürünler" carousel'i

Eklenti bu sayfaya girdiğinde:
1. Floating button belirir
2. Kullanıcı tıklar
3. SepetIQ paneli açılır
4. Analiz başlar

---

## 5. Auth Flow Detayları

### 5.1 Middleware

```typescript
// src/lib/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });
    
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        supabaseResponse.cookies.set(name, value)
                    );
                }
            }
        }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Korumalı route kontrolü
    if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return supabaseResponse;
}
```

### 5.2 OAuth Callback

```typescript
// src/app/(auth)/auth/callback/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error) {
            return NextResponse.redirect(`${origin}/dashboard`);
        }
    }
    
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

---

## 6. State Management

Hackathon kapsamında karmaşık state management gerekmez. Şu yaklaşım yeterli:

- **Server state:** React Server Components + Suspense
- **Client state:** `useState`, `useReducer`
- **Server actions:** Form submissionları için
- **Data fetching:** Native `fetch` + Next.js cache

**Redux/Zustand gerekli değil.** Hackathon scope'unda over-engineering (aşırı mühendislik).

---

## 7. Styling Yaklaşımı

### 7.1 Tailwind + shadcn/ui

```bash
# shadcn/ui kurulumu
pnpm dlx shadcn@latest init

# Component ekleme
pnpm dlx shadcn@latest add button card dialog input select
```

### 7.2 Tema

```typescript
// tailwind.config.ts

export default {
    theme: {
        extend: {
            colors: {
                'sepet-primary': '#10B981',    // Yeşil (yapıcı)
                'sepet-warning': '#F59E0B',    // Sarı (dikkat)
                'sepet-danger': '#EF4444',     // Kırmızı (dur)
                'sepet-info': '#3B82F6'        // Mavi (bilgi)
            }
        }
    }
};
```

### 7.3 Dark Mode

Hackathon kapsamında opsiyonel. Eğer eklenir: shadcn/ui'nin built-in dark mode desteği var.

---

## 8. Deployment (Vercel)

### 8.1 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_BASE_URL=https://sepetiq-api.up.railway.app
SUPABASE_SERVICE_ROLE_KEY=...  # Server-only
```

### 8.2 Vercel Configuration

```json
// vercel.json

{
    "framework": "nextjs",
    "buildCommand": "pnpm build",
    "devCommand": "pnpm dev",
    "installCommand": "pnpm install"
}
```

### 8.3 Domain

- **Production:** `sepetiq.vercel.app` (veya custom domain)
- **Preview:** `sepetiq-git-[branch].vercel.app`

---

## 9. Performance Hedefleri

| Metric | Hedef |
|---|---|
| Lighthouse Performance | > 90 |
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Cumulative Layout Shift | < 0.1 |

Vercel Edge Functions + React Server Components ile bu metriklere ulaşmak kolay.

---

## 10. Demo Stratejisi (Hackathon)

### 10.1 Sahne Akışı

1. **Açılış:** Landing page'i 10 saniye göster (jüri ne yaptığını anlasın)
2. **Login:** Hızlı Google login (önceden hesabı hazır olabilir)
3. **Dashboard:** Stats overview göster — "Bu kullanıcı 12.450 TL tasarruf etmiş"
4. **Demo product page'e git** (`/product/[id]`) — sahte e-ticaret sayfası
5. **Eklenti devreye girer** — analiz akışı
6. **Karar çıkar** — disiplinli mod, "Bekle"
7. **"Daha Detaylı Analiz" butonu** → `/decisions/[id]` sayfası — full agent trace gösterilir
8. **Geri dönüp Stats sayfası göster** — behavioral insights

### 10.2 Önceden Hazırlık

- Demo kullanıcısı hesabı (kayıtlı) — `demo@sepetiq.com`
- Geçmiş alışverişler ile dolu profil
- 3 önceden alınmış karar (history'de görünür)
- Stats sayfası "olgun" görünür (canlı veri varmış gibi)

### 10.3 Yedek Planlar

- Video kaydı (5 dakikalık tam akış)
- Lokal çalıştırma (internet sorunu olursa)
- Pre-rendered HTML snapshot'lar (kritik sayfalar)
