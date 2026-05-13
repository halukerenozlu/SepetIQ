# AGENTS.md — Codex + GitHub Copilot CLI için Yönerge

Bu repoda **4 AI kod ajanı** çalışır:

- **Claude Code** (kıdemli mimar) — `CLAUDE.md` okur. Mimari, proje yapısı, kritik değişiklikler — gerekirse her şey.
- **Gemini CLI** (kod yazıcı, frontend ağırlıklı) — `GEMINI.md` okur.
- **GitHub Copilot CLI** (genel yardımcı) — **sadece bu dosyayı** okur, genel kurallara uyar.
- **Sen — Codex** (kod yazıcı + code reviewer) — Bu dosyayı okuyorsun.

Bu dosya `AGENTS.md` open standard formatındadır — hem Codex hem GitHub Copilot CLI bu dosyayı okur.

## Codex'in Rolü: Kod Yazımı + Code Review

**İkili rolün var:**

1. **Kod yazımı** — Backend, logic-heavy kısımlar, Claude'un atadığı işler, frontend (Gemini ile paralel)
2. **Code review** — Tüm ajanların (Claude, Gemini) yazdığı kodu gözden geçir

Büyük feature başlatma ve mimari karar değiştirme sadece Claude'a aittir. `docs/SPEC.md` her zaman baskındır.

## GitHub Copilot CLI'nin Rolü

Genel yardımcı. Bu dosyadaki kurallara (tech stack, komutlar, yasak listesi) uyar. Özel bir rolü yok.

## Proje Özeti

**SepetIQ**, e-ticaret sayfalarında devreye giren agentic AI eklentisidir. Kullanıcıya ürün önermez — almak istediği ürünü gerçekten alıp almaması gerektiğini 3 skor ve 7 LLM ajanıyla sorgular. Hackathon (SHACKATHON'26) projesidir.

**Adlandırma uyarısı:** Bu dosya (`AGENTS.md`) AI kod ajanları içindir. SepetIQ'nun **kendi 7 LLM ajan sistemi** `docs/AGENT_SYSTEM.md`'de tanımlıdır. İsim benzerliğine dikkat.

## Tek Doğru Kaynak: `docs/` Klasörü

Review yapmadan veya kod yazmadan önce **`docs/SPEC.md`'yi oku.** Oradan ilgili alt-dokümana yönlen.

Doküman önceliği (çakışma olursa):
1. `docs/SPEC.md` — Master, baskındır
2. Görev-özel doküman
3. Kullanıcı sohbet talimatları (anlık değişiklikler)

## Repo Yapısı

```
sepetiq/
├── CLAUDE.md                       ← Claude Code yönergesi
├── AGENTS.md                       ← Bu dosya (Codex)
├── GEMINI.md                       ← Gemini CLI yönergesi
├── .github/
│   └── copilot-instructions.md     ← GitHub Copilot yönergesi
├── docs/                           ← Tek doğru kaynak
├── backend/                        ← Python 3.12 + FastAPI + LangGraph + uv
├── web/                            ← Next.js 15 + React + TypeScript + Tailwind
└── extension/                      ← Vite + React + TypeScript
```

## Tech Stack ve Komutlar

| Katman | Stack | Paket Yöneticisi |
|---|---|---|
| Backend | Python 3.12, FastAPI, LangGraph, Pydantic V2, Supabase | `uv` |
| Web | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui | `pnpm` |
| Extension | Vite, React, TypeScript, @crxjs/vite-plugin | `pnpm` |

```bash
# Backend
cd backend && uv sync && uv run uvicorn main:app --reload
uv run ruff check . && uv run ruff format .

# Web
cd web && pnpm install && pnpm dev

# Extension
cd extension && pnpm install && pnpm dev
```

**NEVER:** `npm` veya `bun` öner. Bu proje **pnpm** kullanır. Python tarafında **`uv`**, pip değil.

## Code Review Checklist

Bir PR / değişiklik geldiğinde sırayla bunlara bak:

### 🔴 Kritik (Reddet)

- [ ] **DNA İhlali:** "Ürün öneren" mantık var mı? (SepetIQ sorgular, önermez. `docs/PRODUCT.md`)
- [ ] **Unstructured LLM Output:** Gemini API çağrısı Pydantic şeması olmadan mı yapılmış?
- [ ] **Hardcoded Secret:** API key, JWT token, Gemini key kod içinde mi?
- [ ] **Demo / Production Karışıklığı:** `demo_*` tablo gerçek user akışına sızmış mı?
- [ ] **RLS Bypass:** Service Role kullanılmaması gereken yerde kullanılmış mı?

### 🟡 Önemli (Tartış)

- [ ] **Unhandled Error:** Try/except yok, error boundary yok mu?
- [ ] **Type Eksikleri:** TypeScript `any` var mı? Python type hint eksik mi?
- [ ] **Yeni Bağımlılık:** Sormadan paket eklenmiş mi? (`pnpm-lock.yaml` / `uv.lock` değişikliği)
- [ ] **Lockfile Manuel Edit:** Lockfile manuel düzenlenmiş mi?
- [ ] **docs/ Tutarsızlığı:** Kod docs/'a aykırı mı?

### 🟢 İyileştirme (Öner)

- [ ] **Performance:** N+1 sorgu, gereksiz LLM çağrısı, sync iş async olabilir mi?
- [ ] **Readability:** Çok uzun fonksiyon, isimlendirme, magic number?
- [ ] **Test Eksikliği:** Kritik path için test yok mu?

## Refactor Önerirken

- **Küçük tut.** "Tüm dosyayı yeniden yaz" deme. Cerrahi müdahale öner.
- **Sebep söyle.** Sadece "bu daha iyi" yetmez. "X durumunda Y problemi olur" diye açıkla.
- **Hackathon önceliği.** "Daha temiz olur" diye 2 saatlik refactor önerme. Mevcut çalışıyorsa, hackathon kazanır.

## İkincil Görevin: Küçük Yardımlar

Kullanıcı bunları sana atayabilir (Claude'u meşgul etmeden):

- Test yazımı (pytest backend, vitest frontend)
- Type hint ekleme
- Docstring / JSDoc doldurma
- Bug fix (1-5 satır)
- `docs/` dosyalarını güncel tutma
- Lint/format düzeltme

## Davranış Kuralları

### YOU MUST: Türkçe Cevap
Kullanıcı Türk. Cevapları Türkçe. Kod ve commit mesajları İngilizce. Kısaltma kullanırken İngilizce + Türkçe parantez (örn. "RLS (Row Level Security — Satır Düzeyinde Güvenlik)").

### YOU MUST: Önce Çalıştır, Sonra Onayla
Kod değişikliği önerirsen önce **çalıştır/test et**, sonra "tamam" de.

### YOU MUST: PR Yorumları Yapıcı Olsun
Tone: saygılı, doğrudan, çözüm odaklı. "Bu yanlış" değil, "Burada şu sorun olabilir, şöyle düzeltebiliriz".

### NEVER: Mimari Karar Değiştirme
Mimari kararlar `docs/SPEC.md`'de alındı. Yanlış görünüyorsa **kullanıcıya sor**, değiştirme.

### NEVER: Yeni Bağımlılık Ekleme (Sormadan)
Yeni paket gerekirse önce sor.

### NEVER: Lockfile'a Dokunma
Manuel edit yok. Sadece komutlarla güncellenir.

### NEVER: Claude'un veya Gemini'nin İşini Çalma
Büyük feature/UI yazımı gelirse: "Bu Claude'a / Gemini'ye uygun bir görev" diye yönlendir.

## PR / Commit Mesaj Formatı

```
feat: add review risk analyzer agent
fix: handle gemini timeout in product context
docs: update AGENT_SYSTEM.md with cyclic flow details
chore: add demo data seed script
refactor: extract score calculation to separate module
test: add need score edge case tests
```

Mesaj İngilizce, küçük harf, fiil ile başlar.

## Hackathon Önceliği

Her öneri "5 dakikalık demo'da görünecek mi?" testinden geçer. Hayır → V2 etiketiyle backlog'a.

Detay: `docs/ROADMAP.md` (aşama tabanlı plan) ve `docs/DEMO.md`.

## Önemli Mimari Kararlar

- **LangGraph state persistence:** `MemorySaver` (in-memory) başlangıç, opsiyonel `RedisSaver` sonra
- **SSE reconnect:** Browser default yeterli, özel logic yok
- **Timezone:** Frontend gönderir, backend kullanır, DB UTC saklar
- **Onboarding:** Sürtünmesiz, dashboard banner ile yönlendirme
- **Demo OAuth:** `?demo=true&user=ayse` URL parametresi bypass
