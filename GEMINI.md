# GEMINI.md — Gemini CLI için Yönerge

Bu repoda **4 AI kod ajanı** çalışır:
- **Claude Code** (kıdemli mimar) — Mimari, proje yapısı, kritik değişiklikler — gerekirse her şey.
- **Sen — Gemini CLI** (kod yazıcı, frontend ağırlıklı) — Bu dosyayı okuyorsun.
- **GitHub Copilot CLI** (genel yardımcı) — `AGENTS.md` okur.
- **Codex** (kod yazıcı + code reviewer) — `AGENTS.md` okur.

## Senin Rolün: Kod Yazımı (Özellikle Frontend)

Şunları yaparsın:
- **Frontend component'leri** (React, Next.js sayfaları, Tailwind ile UI)
- **Form'lar, validasyonlar, fetch çağrıları**
- **CSS/Tailwind düzenlemeleri**
- **Tekrar eden iş** (mock data üretimi, seed dosyaları)
- Claude veya kullanıcının verdiği brief/görev doğrultusunda implementation

**Mimari karar değiştirme ve büyük feature başlatma Claude'a aittir.** `docs/SPEC.md` her zaman baskındır.

## Proje Özeti

**SepetIQ**, e-ticaret sayfalarında "sepete ekle" anında devreye giren agentic AI eklentisidir. Kullanıcıya ürün önermez — almak istediği ürünü gerçekten alıp almaması gerektiğini sorgular. Hackathon (SHACKATHON'26) projesidir.

**Adlandırma uyarısı:** Repo root'undaki `AGENTS.md` Codex için yönergedir. SepetIQ'nun **kendi 7 LLM ajan sistemi** `docs/AGENT_SYSTEM.md`'de tanımlıdır. Karıştırma.

## Tek Doğru Kaynak: `docs/` Klasörü

Kod yazmadan önce **`docs/SPEC.md`'yi oku.** Oradan ilgili alt-dokümana yönlen.

Doküman önceliği (çakışma olursa):
1. `docs/SPEC.md` — Master, baskındır
2. Görev-özel doküman
3. Kullanıcı sohbet talimatları (anlık değişiklikler)

## Repo Yapısı

```
sepetiq/
├── CLAUDE.md                       ← Claude Code yönergesi
├── AGENTS.md                       ← Codex yönergesi
├── GEMINI.md                       ← Bu dosya (Gemini CLI)
├── .github/
│   └── copilot-instructions.md     ← GitHub Copilot yönergesi
├── docs/                           ← Tek doğru kaynak
├── backend/                        ← Python + FastAPI (genelde Claude yazar)
├── web/                            ← Next.js + React (genelde SEN yazarsın)
└── extension/                      ← Vite + React (paylaşımlı)
```

## Tech Stack ve Komutlar

| Katman | Stack | Paket Yöneticisi |
|---|---|---|
| Backend | Python 3.12, FastAPI, LangGraph, Pydantic V2, Supabase | `uv` |
| Web | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui | `pnpm` |
| Extension | Vite, React, TypeScript, @crxjs/vite-plugin | `pnpm` |

```bash
# Backend (genelde sen dokunmazsın)
cd backend && uv sync && uv run uvicorn main:app --reload

# Web (senin ana çalışma alanın)
cd web && pnpm install && pnpm dev

# Extension
cd extension && pnpm install && pnpm dev
```

**NEVER:** `npm` veya `bun` kullanma. Bu proje **pnpm** kullanır. Python tarafında **`uv`**, pip değil.

## Senin Ana Çalışma Alanın: Web (Next.js)

Companion Web'in çoğu sayfasını sen yazacaksın. Detaylar `docs/WEB.md`'de. Önemli sayfalar:

- **Landing page** (`/`) — Marketing sayfası
- **Login** (`/login`) — Google OAuth butonu
- **Dashboard** (`/dashboard`) — Stats overview + recent decisions
- **History** (`/dashboard/history`) — Karar listesi + filtreler
- **Purchases** (`/dashboard/purchases`) — Past purchases ekleme formu
- **Stats** (`/dashboard/stats`) — Recharts grafikleri (demo için kritik)
- **Decision Detail** (`/decisions/[id]`) — Agent trace tam görünüm
- **Preferences** (`/dashboard/preferences`) — Mod ve bütçe ayarları
- **Demo Product Page** (`/product/[id]`) — Sahte e-ticaret sayfası

Eklenti (extension) UI'sı için `docs/EXTENSION.md`'ye bak — özellikle Decision Panel component'i.

## UI / UX Kuralları

### Stack
- **Component library:** shadcn/ui (Card, Button, Input, Dialog, vb.)
- **Styling:** Tailwind CSS (utility-first, custom CSS minimum)
- **Charts:** Recharts (Stats sayfası)
- **Forms:** Native React state (form library yok, hackathon scope'unda gereksiz)
- **State:** `useState`, `useReducer`. Redux/Zustand **yok**.
- **Data fetching:** Native `fetch` + Next.js cache. SWR/TanStack Query **yok**.

### Renk Paleti (Tailwind utility'leri)

```
Primary (yapıcı):   emerald-500 / emerald-600
Warning (dikkat):   amber-500
Danger (dur):       red-500
Info (bilgi):       sky-500
Neutral:            zinc-* skalası
```

Karar verdiren renkler:
- **Buy** kararı: emerald-500
- **Conditional Buy:** lime-500
- **Wait:** amber-500
- **Don't Buy:** red-500
- **Consider Alternative:** sky-500

### Skor Renk Kodu
- 80-100: emerald-500
- 60-79: lime-500
- 40-59: amber-500
- 20-39: orange-500
- 0-19: red-500

### Tipografi
- **Font:** Inter (Google Fonts, Next.js'in `next/font/google` ile yüklenir)
- **Başlıklar:** Bold, tracking-tight
- **Body:** Regular, leading-relaxed

### Ton (UI Metinleri)
Detay `docs/PRODUCT.md` § 10'da etik sınırlar:
- ✅ "Bu karar şu an ihtiyaçtan çok anlık istek gibi görünüyor"
- ❌ "Yine gereksiz bir şey alacaksın"

Suçlayıcı dil yasak. Saygılı ve net.

## Davranış Kuralları

### YOU MUST: Türkçe Cevap
Kullanıcı Türk. Cevaplar Türkçe. Kod, değişken adları, commit mesajları İngilizce. Kısaltma kullanırken İngilizce + Türkçe parantez.

### YOU MUST: Önce Brief Oku
Kullanıcı sana iş verdiğinde önce **bağlam dosyalarını oku** (genelde `docs/SPEC.md` + 1-2 alt doküman). Sonra implement et.

### YOU MUST: Tek Component Tek Dosya
Bir component bir dosyada. Çoklu component aynı dosyada yazma.

### YOU MUST: TypeScript Strict
TypeScript `strict: true` modunda. `any` kullanma. Tipleri eksiksiz yaz.

### YOU MUST: Tailwind, Custom CSS Değil
CSS yazma. Tailwind utility'leri kullan. Çok özel durumlarda `@apply` ile component class yaz, ama önce Tailwind'de çözümü ara.

### YOU MUST: shadcn/ui First
UI element gerekirse önce shadcn/ui'da var mı bak. Varsa onu kullan. Yoksa Tailwind ile yaz.

### NEVER: localStorage / sessionStorage (Artifact'larda)
Eğer artifact üretiyorsan browser storage **çalışmaz** Claude.ai sandbox'ında. React state veya in-memory variable kullan.

### NEVER: Yeni Bağımlılık Ekleme (Sormadan)
Yeni paket gerekirse **önce sor**. SepetIQ stack'i kapalıdır.

### NEVER: Lockfile'a Dokunma
`pnpm-lock.yaml` manuel edit yok. Sadece `pnpm install` ile güncellenir.

### NEVER: Mimari Karar Değiştirme
"Aslında Next.js yerine Astro kullansak" — **HAYIR.** Mimari kararlar alındı, değişmez.

### NEVER: Test Yazma (Sormadan)
Hackathon scope'unda test yazımı yok. Eğer kullanıcı talep ederse yaz, yoksa atla.

## Görev Bazlı Hangi Dökümanı Okumalısın

| Görev | Mutlaka Oku | Yardımcı |
|---|---|---|
| Web sayfa (Landing, Dashboard) | SPEC, WEB | PRODUCT (ton için) |
| Component (form, kart, modal) | SPEC, WEB | DESIGN (varsa) |
| Demo ürün sayfası (`/product/[id]`) | SPEC, WEB, MOCKDATA, EXTENSION | - |
| Mock data üretimi | SPEC, MOCKDATA | PRODUCT |
| Stats sayfası grafikleri | SPEC, WEB, DATABASE, API | - |
| Eklenti UI component'i | SPEC, EXTENSION, API | - |
| Decision Detail (agent trace) | SPEC, WEB, API, AGENT_SYSTEM | - |

## Önemli Notlar

- **Aşama tabanlı plan:** `docs/ROADMAP.md` aşamalar halinde.
- **Hackathon önceliği:** Her feature "demo'da görünecek mi?" testi.
- **Demo data:** `demo_products`, `demo_user_profiles` sadece demo için, gerçek user akışıyla karıştırma.

## Önemli Mimari Kararlar (Hızlı Referans)

- **State persistence:** Backend `MemorySaver` kullanır. Sen frontend yazıyorsun, doğrudan etkin yok.
- **SSE (Server-Sent Events — Sunucu Tarafından Gönderilen Olaylar):** Decision Panel SSE stream'i tüketir. `EventSource` API'sini kullan. Reconnect için özel kod yazma — browser default yeter.
- **Timezone:** `Intl.DateTimeFormat().resolvedOptions().timeZone` ile kullanıcı timezone'unu al, backend'e gönder.
- **Onboarding:** Dashboard'da conditional banner (`if (purchaseCount === 0) showBanner`).
- **Demo OAuth:** `/?demo=true&user=ayse` URL parametresi bypass. Middleware kontrol eder.

## Çalışma Stili

- **Brief'i tam oku.** Hızla geçme — Claude detay vermiştir.
- **Soru sor.** Belirsizlik varsa kullanıcıya sor, varsayım yapma.
- **Küçük adım.** Bir sayfayı tek seferde değil, parçalara böl.
- **Test et.** Yazdığını çalıştır, hata var mı bak.
- **Plan mode kullan.** Karmaşık görevlerde Gemini CLI'nin plan mode'unu kullan.
