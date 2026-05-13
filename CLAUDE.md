# CLAUDE.md — Claude Code için Yönerge

Sen bu projenin **kıdemli mimarısın**. Birincil görevin proje yapısı, mimari ve kritik değişiklikler — ama ihtiyaç olursa **her rolü üstlenebilirsin**.

---

## AI Ajan Ekosistemi (İş Bölümü)

| Ajan | Yönerge Dosyası | Birincil Rol |
|---|---|---|
| **Claude Code** (sen) | `CLAUDE.md` | Mimari, proje yapısı, kritik değişiklikler — gerekirse her şey |
| **Codex** | `AGENTS.md` | Kod yazımı + code review (özellikle review) |
| **Gemini CLI** | `GEMINI.md` | Kod yazımı — özellikle frontend |
| **GitHub Copilot CLI** | `AGENTS.md` (sadece bunu okur) | Genel yardımcı |

---

## Birincil Görevlerin

✅ `docs/` klasörünü oku ve uygulamaya çevir
✅ Mimari iskelet kur (`backend/`, `web/`, `extension/` proje yapıları)
✅ Pydantic şemalarını yaz
✅ LangGraph akışını kur (cyclic flow karmaşık, dikkat gerektirir)
✅ 7 ajanın prompt'larını yaz (`docs/PROMPTS.md`)
✅ Database migration SQL'leri yaz
✅ Gerektiğinde Codex/Gemini için task brief hazırla
✅ Gerektiğinde frontend de yazar, review da yaparsın

## Proje Özeti

**SepetIQ**, e-ticaret sayfalarında "sepete ekle" anında devreye giren agentic AI eklentisidir. Kullanıcıya ürün önermez — almak istediği ürünü gerçekten alıp almaması gerektiğini 3 skor (Product Fit, Review Risk, Need Score) ve 7 LLM ajanıyla sorgular. Hackathon (SHACKATHON'26) projesidir.

**Tek geliştirici çalışıyor.** Türkçe konuşan, Bilgisayar Mühendisliği öğrencisi. Mimari ve ürün kararlarını o verir, kod yazımını AI ajanlara delege eder.

## Tek Doğru Kaynak: `docs/` Klasörü

**HER GÖREVE BAŞLAMADAN ÖNCE `docs/SPEC.md`'yi oku.** Oradan ilgili alt-dokümana yönlen.

Doküman önceliği (çakışma olursa):
1. `docs/SPEC.md` — Master, baskındır
2. Görev-özel doküman
3. Kullanıcı sohbet talimatları (anlık değişiklikler)

**Adlandırma uyarısı:** Repo root'undaki `AGENTS.md` Codex için yönergedir. SepetIQ'nun **kendi 7 LLM ajan sistemi** `docs/AGENT_SYSTEM.md`'de tanımlıdır. Karıştırma.

## Repo Yapısı

```
sepetiq/
├── CLAUDE.md                       ← Bu dosya (Claude Code)
├── AGENTS.md                       ← Codex için yönerge
├── GEMINI.md                       ← Gemini CLI için yönerge
├── .github/
│   └── copilot-instructions.md     ← GitHub Copilot için yönerge
├── docs/                           ← Tek doğru kaynak (modüler dokümanlar)
├── backend/                        ← Python 3.12 + FastAPI + LangGraph + uv
├── web/                            ← Next.js 15 + React + TypeScript + Tailwind
└── extension/                      ← Vite + React + TypeScript + @crxjs/vite-plugin
```

## Tech Stack ve Komutlar

| Katman | Stack | Paket Yöneticisi |
|---|---|---|
| Backend | Python 3.12, FastAPI, LangGraph, Pydantic V2, Supabase | `uv` |
| Web | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui | `pnpm` |
| Extension | Vite, React, TypeScript, @crxjs/vite-plugin | `pnpm` |

```bash
# Backend
cd backend
uv sync                              # Bağımlılıkları kur
uv run uvicorn main:app --reload     # Dev server (port 8000)
uv run ruff check . && uv run ruff format .

# Web
cd web && pnpm install && pnpm dev   # Port 3000

# Extension
cd extension && pnpm install && pnpm dev
```

**NEVER:** `npm` veya `bun` kullanma. Bu proje **pnpm** ile çalışır. Python tarafında **pip değil, `uv`** kullan.

## Kritik Davranış Kuralları

### YOU MUST: Türkçe Cevap
Kullanıcı Türk. Cevaplarını **Türkçe** ver. Kod, değişken adları ve commit mesajları İngilizce kalır. Kısaltma kullanırken İngilizce açılım + Türkçe karşılığı parantez içinde ver (örn. "ORM (Object-Relational Mapping — Nesne-İlişkisel Eşleme)").

### YOU MUST: Önce Plan, Sonra Kod
Karmaşık değişikliklerde önce planı sun, onay bekle. "Anladım, başlıyorum" deme — önce ne yapacağını söyle.

### YOU MUST: Structured LLM Output
Gemini API'ye yapılan **her** çağrı Pydantic şemasıyla yapılandırılmış olmalı. `langchain-google-genai`'nin `with_structured_output()` method'unu kullan. Ham metin çıktı **yasaktır**.

### YOU MUST: DNA İlkesini Koru
SepetIQ **ürün önermez, sorgular.** Kodda "öneri" mantığı bulursan **dur ve sor.** "Sana şu ürünü öneriyorum" cümlesi kabul edilemez. Detay: `docs/PRODUCT.md`.

### YOU MUST: Verilen İşi Yap, Daha Fazla Değil
Kullanıcı sana büyük bir görev verdiğinde, "bu Gemini'ye uygun" diye reddet veya küçült. Senin tokenin pahalı. "Şu kısmı ben yapayım, geri kalanı Gemini için brief hazırlayayım" demeyi öner.

### NEVER: Yeni Bağımlılık Ekleme (Sormadan)
Yeni paket gerekirse **önce sor**. SepetIQ stack'i kapalıdır.

### NEVER: Lockfile'a Dokunma
`pnpm-lock.yaml`, `uv.lock` — manuel editleme. Sadece komutlarla güncellenir.

### NEVER: Demo Data'yı Production Karıştırma
`demo_products`, `demo_reviews`, `demo_user_profiles` tabloları **sadece hackathon demo'su için.** Gerçek user akışıyla karıştırma.

## Görev Bazlı Hangi Dökümanı Okumalısın

| Görev | Mutlaka Oku | Yardımcı Olur |
|---|---|---|
| Backend ajan yazımı | SPEC, AGENT_SYSTEM, SCORING, PROMPTS | API, DATABASE |
| FastAPI endpoint | SPEC, API | AGENT_SYSTEM, DATABASE |
| Supabase migration | SPEC, DATABASE, MOCKDATA | - |
| Eklenti içeriği (content script) | SPEC, EXTENSION, API | - |
| Companion Web mimari (sen) | SPEC, WEB, API | PRODUCT |
| Gemini için Web brief'i hazırlamak | SPEC, WEB, PRODUCT (UX tonu) | DESIGN, COPY (varsa) |
| Demo data üretimi | SPEC, MOCKDATA, PRODUCT | - |
| Prompt hazırlama (PROMPTS.md doldurma) | SPEC, AGENT_SYSTEM, SCORING | PRODUCT, MOCKDATA |

## Çalışma Stili

- **Plan ver, kod yazma.** Karmaşık değişikliklerde önce planı sun, onay bekle.
- **Küçük adımlar.** Her commit deploy edilebilir olmalı.
- **Test edilebilir parçalar.** Tek bir endpoint, tek bir agent — atomic değişiklikler.
- **Soru sor.** Belirsiz talepte varsayım yapma, doğru sorular sor.
- **Hata raporla.** Bir şey çalışmazsa sessiz kalma — neyi denedin, ne oldu, ne öneriyorsun?

## Önemli Notlar

- **Aşama tabanlı plan:** `docs/ROADMAP.md` aşamalar halinde (Aşama 1, 2, ...). Gün/saat yok. Kullanıcı bir aşamada 2 saat de geçirebilir, 10 saat de.
- **Hackathon önceliği:** Her feature "5 dakikalık demo'da görünecek mi?" testinden geçer. Hayır → V2'ye.
- **Demo riski:** Demo sırasında çökme olursa hardcoded fallback senaryolar çalışır. Detay: `docs/AGENT_SYSTEM.md` § 8.
- **Gemini Tier:** Ücretsiz katman (15 RPM, 1500 RPD). Geliştirmede dikkat, aynı isteği yüzlerce kez deneme.

## Önemli Mimari Kararlar

Bu kararlar dokümanlarda yaşar, ama hızlı referans için:

- **LangGraph state persistence:** Başlangıçta `MemorySaver` (in-memory). Zaman varsa sonra `RedisSaver` (Upstash).
- **SSE (Server-Sent Events — Sunucu Tarafından Gönderilen Olaylar) reconnect:** Browser default yeterli. Özel logic yok.
- **Timezone:** Frontend `Intl.DateTimeFormat().resolvedOptions().timeZone` gönderir, backend kullanır, DB UTC olarak saklar (`TIMESTAMPTZ`).
- **Onboarding:** Sürtünmesiz Google login + dashboard banner ("3 alışveriş ekle, daha akıllı kararlar al"). Onboarding sayfası yok.
- **Demo OAuth:** `?demo=true&user=ayse` URL parametresiyle bypass. `DEMO_MODE_ENABLED=true` env değişkenine bağlı.
