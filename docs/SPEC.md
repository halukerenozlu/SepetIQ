# SepetIQ — Master Specification

> Bu doküman SepetIQ projesinin tek doğru referansıdır. Tüm AI ajanları (Claude Code, GitHub Copilot, OpenAI Codex, opencode, Gemini) önce bu dökümanı okumalı, sonra alt-dökümanlara dalmalıdır.

---

## 1. Proje Özeti

**SepetIQ**, e-ticarette "sepete ekle" butonuna basmadan önce devreye giren agentic AI eklentisidir. Ürünü önermez, **sorgular**: "Bu ürünü gerçekten alıp almaman gerektiğini" üç skor (Product Fit, Review Risk, Need Score) ve döngüsel agent akışı (Cyclic Intelligence) ile analiz eder.

**Tek cümlelik DNA:**

> SepetIQ ne alacağını söylemez — almak istediğin ürünü gerçekten alıp almaman gerektiğini sorgular.

**Felsefe:** Friction by Design — Bilinçli kararlar için kasıtlı sürtünme.

---

## 2. Form Faktörü

İki katmanlı bir companion app yapısı:

- **Katman 1 — Browser Eklentisi (Hızlı Karar Katmanı):** Gerçek e-ticaret sayfalarında çalışır. Ürünü okur, kararı verir, agent trace gösterir.
- **Katman 2 — Companion Web (Derin Analiz Katmanı):** Kullanıcı profili, geçmiş kararlar, tasarruf istatistikleri, davranış analizi.

İki katman paylaşılan bir backend ve veritabanı kullanır. Kullanıcı Google ile giriş yapar; her iki katmanda aynı oturumu kullanır.

---

## 3. Hedef Kullanıcı

**Primary (Birincil):** Dürtüsel alışveriş tetikleyicilerinden (indirim, sosyal medya, gece alışverişi) etkilenip pişman olan tüketici.

**Secondary (İkincil):** Bilinçli alışveriş istiyor ama davranışını kontrol altına alamayan, finansal disiplin arayışında olan kullanıcı.

**Anti-Persona (Hedef Olmayan):** "Bana ne alayım önerisi ver" diyen keşif modundaki kullanıcı. SepetIQ keşif aracı değildir.

---

## 4. Yüksek Seviye Mimari

```
┌─────────────────────────────────────────────────────────┐
│                      KULLANICI                          │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  Browser         │          │  Companion Web   │
│  Extension       │          │  (Next.js)       │
│  (React + Vite)  │          │                  │
└──────────────────┘          └──────────────────┘
         │                              │
         └──────────────┬───────────────┘
                        ▼
          ┌────────────────────────────┐
          │   Backend (FastAPI)        │
          │   ┌──────────────────┐     │
          │   │ LangGraph Agent  │     │
          │   │ Orchestration    │     │
          │   │ (7 Agents)       │     │
          │   └──────────────────┘     │
          │            │               │
          │            ▼               │
          │   ┌──────────────────┐     │
          │   │  Gemini 2.5 Flash│     │
          │   └──────────────────┘     │
          └────────────────────────────┘
                        │
                        ▼
          ┌────────────────────────────┐
          │   Supabase                 │
          │   (PostgreSQL + Auth)      │
          └────────────────────────────┘
```

---

## 5. Tech Stack

| Katman              | Teknoloji                                      | Sebep                            |
| ------------------- | ---------------------------------------------- | -------------------------------- |
| Eklenti Frontend    | React + TypeScript + Vite + @crxjs/vite-plugin | Bilinen stack, AI desteği yüksek |
| Eklenti Styling     | Tailwind CSS                                   | Hızlı UI                         |
| Companion Web       | Next.js 15 + React + TypeScript                | Server components, app router    |
| Web Styling         | Tailwind + shadcn/ui                           | Hazır component'ler              |
| Backend             | Python 3.12 + FastAPI + Pydantic               | Async, type-safe, hızlı          |
| Agent Orchestration | LangGraph (Python)                             | Cyclic flow, görsel trace        |
| LLM                 | Gemini 2.5 Flash                               | Ücretsiz katman, hızlı           |
| Veritabanı          | Supabase PostgreSQL                            | Auth + DB tek pakette            |
| Auth                | Supabase Auth (Google OAuth)                   | 5 dakikada kurulum               |
| Frontend Deploy     | Vercel                                         | Next.js için optimal             |
| Backend Deploy      | Railway                                        | Python + Postgres, cold start az |
| Paket Yön. (Py)     | uv                                             | pip'ten 10-100x hızlı            |
| Paket Yön. (JS)     | pnpm                                           | Vercel native, disk efficient    |

---

## 6. Doküman Haritası

Detaylı bilgi için ilgili dökümana git:

| Doküman                              | İçerik                                           | Kim İçin                       |
| ------------------------------------ | ------------------------------------------------ | ------------------------------ |
| [PRODUCT.md](./PRODUCT.md)           | Vizyon, DNA, pitch, kullanıcı senaryoları        | Pazarlama / Sunum hazırlığı    |
| [AGENT_SYSTEM.md](./AGENT_SYSTEM.md) | 7 LLM ajanı detayı, LangGraph akışı, prompt'lar  | Backend geliştirme             |
| [SCORING.md](./SCORING.md)           | 3 skor hesabı, karar matrisi, mod sistemi        | Backend + Frontend             |
| [API.md](./API.md)                   | FastAPI endpoint'leri, request/response şemaları | Backend + Frontend entegrasyon |
| [DATABASE.md](./DATABASE.md)         | Supabase tabloları, ilişkiler, RLS politikaları  | Backend + DB setup             |
| [EXTENSION.md](./EXTENSION.md)       | Eklenti mimarisi, content scripts, popup         | Eklenti geliştirme             |
| [WEB.md](./WEB.md)                   | Companion web sayfaları, component'ler           | Web geliştirme                 |
| [MOCKDATA.md](./MOCKDATA.md)         | Demo ürünleri, yorumları, kullanıcı geçmişleri   | Veri hazırlama                 |
| [DEMO.md](./DEMO.md)                 | 5 dakikalık sunum senaryosu, demo akışı          | Sunum prova                    |
| [ROADMAP.md](./ROADMAP.md)           | 7 günlük geliştirme planı                        | Proje yönetimi                 |

> ⚠ **Adlandırma uyarısı:** Repo root'unda iki ayrı dosya bulunur:
>
> - `/CLAUDE.md` — Claude Code için birincil developer yönergesi
> - `/AGENTS.md` — Codex/Cursor için ikincil developer + code review yönergesi
>
> Bu iki dosya **AI kod ajanlarına** komutlar verir. SepetIQ'nun **kendi LLM ajan sistemi** ise `docs/AGENT_SYSTEM.md`'de tanımlıdır (Product Context Agent, Review Risk Analyzer, vb.). İsim benzerliğine dikkat: `AGENTS.md` ≠ `AGENT_SYSTEM.md`.

---

## 7. Temel İlkeler (Decision Principles)

AI ajanlara kod yazdırırken bu ilkelere uyulmasını sağla:

### 7.1 DNA İlkesi

Kod tabanında **hiçbir yerde** "ürün öneri" mantığı olmayacak. SepetIQ sadece niyetli ürünü sorgular. Eğer bir feature "öneri" gibi durmaya başlıyorsa, **yanlış yoldasın.**

### 7.2 Açıklanabilirlik İlkesi

Her karar agent trace ile açıklanabilir olmalı. "LLM şöyle dedi" yeterli değil. Hangi ajan, hangi veriyle, hangi sebeple bu skoru üretti — kullanıcı görebilmeli.

### 7.3 Structured Output İlkesi

LLM çıktısı asla ham metin olarak kullanılmaz. Her LLM çağrısı Pydantic şemasına bağlı, Zod ile frontend'de doğrulanır.

### 7.4 Friction by Design İlkesi

UX (User Experience — Kullanıcı Deneyimi) "kolaylaştırma" değil, "doğru zorlaştırma" prensibine göre tasarlanır. Disiplinli mod'da "al" demek gerçekten zor olmalı.

### 7.5 Veri Sahipliği İlkesi

Kullanıcı verisi kullanıcıya aittir. Anonim agregat dışında hiçbir veri kullanıcı bilgisi olmadan kullanılmaz. Gemini ücretsiz katmanı veri kullanım sorunu vardır — production'da Tier 1'e geçilir.

### 7.6 Demo Önceliği İlkesi

Hackathon süresinde her geliştirilen feature şu soruya cevap vermeli: "Bu, 5 dakikalık demo'da görünecek mi?" Cevap "hayır" ise, v2'ye ertelenir.

---

## 8. Anti-Patterns (Kaçınılması Gereken Yaklaşımlar)

❌ **Kullanıcıya ürün önerme:** "Sana şu ürünü öneriyorum" cümlesi SepetIQ'da yoktur.

❌ **Generik chat arayüzü:** ChatGPT benzeri sohbet kutusu yapma. SepetIQ structured (yapılandırılmış) bir karar paneli sunar.

❌ **Psikolojik teşhis:** "Sen alışveriş bağımlısısın" gibi ifadeler ürünün etik sınırlarını aşar.

❌ **Karmaşık onboarding (kullanıcı kabul akışı):** İlk açılışta 10 soru sorma. Hızlı başla, kullanıcı zamanla kişiselleştirsin.

❌ **Çoklu kategori desteği (v1'de):** Demo'da sadece Elektronik + Kozmetik. Geri kalan v2'de.

❌ **Gerçek e-ticaret API'leri:** Trendyol/Hepsiburada API'siyle entegre olma. Eklenti DOM scraping ile yeterli.

❌ **Ödeme entegrasyonu (v1'de):** Stripe vb. yok. Premium bahsi sadece sunumda.

---

## 9. Başarı Kriterleri (Definition of Done)

Hackathon teslimi için aşağıdaki tüm kriterler karşılanmalı:

- [ ] Eklenti gerçek (veya sahte) bir e-ticaret sayfasında çalışır
- [ ] 3 skor doğru hesaplanır ve görüntülenir
- [ ] LangGraph cyclic flow (en az 1 döngü) çalışır
- [ ] Agent trace yan panelde görünür
- [ ] 3 mod arasında geçiş yapılabilir, karar değişir
- [ ] Geçmiş alışveriş kıyaslaması en az 1 senaryoda tetiklenir
- [ ] Companion web'de Google login çalışır
- [ ] Companion web'de "Geçmiş Kararlar" sayfası gerçek backend verisi gösterir
- [ ] Backend Railway'de deploy edilmiş
- [ ] Frontend Vercel'de deploy edilmiş
- [ ] 5 dakikalık demo provası yapılmış ve video kaydı alınmış

---

## 10. Versiyon ve Güncellemeler

| Versiyon | Tarih      | Değişiklik |
| -------- | ---------- | ---------- |
| 0.1      | 2026-05-13 | İlk taslak |

Bu döküman değiştiğinde, ilgili alt-dökümanları da güncelle. Tutarsızlık varsa, SPEC.md baskındır.
