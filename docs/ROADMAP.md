# ROADMAP.md — 7 Günlük Geliştirme Planı

> Tek geliştirici (AI ajanlarla kod yazımı) için 7 günlük gün-gün plan. Her gün net hedefler, çıktılar ve checkpoint'ler.

---

## 1. Genel Strateji

### 1.1 Çalışma Yaklaşımı
- **Sen:** Mimar, ürün yöneticisi, code reviewer, sunucu
- **AI ajanlar:** Implementer (Claude Code, GitHub Copilot, OpenAI Codex, opencode, Gemini)
- **Tek gerçek kaynak:** `/docs/` klasörü — her AI ajana bu dökümanları ver

### 1.2 Günlük Pattern
```
Sabah (3-4 saat) — Yoğun implementation
Öğle — Code review, AI çıktılarını kontrol
Öğleden sonra (3-4 saat) — Entegrasyon, debug
Akşam — Commit, push, ertesi gün hazırlığı
```

### 1.3 Risk Yönetimi
- **Her gün sonunda working demo olmalı** (incremental)
- **Mock data hep hazır** — backend yoksa frontend mock'larla çalışır
- **Her commit deploy edilebilir** olmalı

---

## 2. Gün 1 (Bugün, 13 Mayıs) — Hazırlık ve Setup

### 2.1 Hedef
Tüm geliştirme ortamını kurmak, repo yapısını oluşturmak, ilk "Hello World" deploy'unu yapmak.

### 2.2 Görevler

**Sabah:**
- [ ] GitHub repo oluştur: `sepetiq` (private veya public)
- [ ] Monorepo yapısı kur:
  ```
  sepetiq/
  ├── docs/        (bu dokümanlar buraya kopyalanır)
  ├── backend/     (Python + FastAPI)
  ├── web/         (Next.js)
  ├── extension/   (Vite + React)
  └── README.md
  ```
- [ ] `docs/` klasörünü repo'ya commit et — tüm AI ajanlara ortak referans
- [ ] Supabase projesi oluştur (free tier)
  - Project name: `sepetiq`
  - Region: Frankfurt (eu-central)
  - Google OAuth provider ekle
- [ ] Vercel hesabı bağla, GitHub repo'sunu Vercel'e ekle
- [ ] Railway hesabı oluştur, GitHub repo'sunu Railway'e ekle
- [ ] Gemini API key al (Google AI Studio)

**Öğleden sonra:**
- [ ] **Backend setup:**
  - `uv init`, `pyproject.toml` oluştur
  - FastAPI + Pydantic + LangGraph + supabase-py kur
  - `main.py` — hello world endpoint
  - Railway'e ilk deploy
- [ ] **Web setup:**
  - `pnpm create next-app web` (Next.js 15 + Tailwind + TypeScript)
  - shadcn/ui kur
  - Landing page placeholder
  - Vercel'e ilk deploy
- [ ] **Extension setup:**
  - `pnpm create vite extension --template react-ts`
  - `@crxjs/vite-plugin` kur
  - `manifest.json` oluştur (EXTENSION.md'deki örnekten)
  - Basit floating button → Chrome'a yükle, çalıştığını gör

### 2.3 Gün Sonu Çıktısı
- ✅ 3 ortam kurulu (backend, web, extension)
- ✅ Backend Railway'de canlı (URL hazır)
- ✅ Web Vercel'de canlı (URL hazır)
- ✅ Extension Chrome'da yüklü, floating button görünüyor
- ✅ Supabase projesi aktif, Google OAuth yapılandırılmış

### 2.4 Risk
- **Supabase Google OAuth setup** — Console'da Google Cloud Project + OAuth client ID gerekli. Bu 1-2 saat sürebilir.
- **Çözüm:** Önce OAuth olmadan email/password ile aç, OAuth'u Gün 4'te ekle.

---

## 3. Gün 2 (14 Mayıs) — Veritabanı + Mock Data

### 3.1 Hedef
Veritabanı şemasını oluştur, demo data'yı yükle, backend ile bağlantıyı doğrula.

### 3.2 Görevler

**Sabah — Database (DATABASE.md ile):**
- [ ] Supabase SQL editor'de migration'ları çalıştır:
  - `001_create_tables.sql` — tüm tablolar
  - `002_create_rls_policies.sql` — RLS politikaları
  - `003_create_functions.sql` — `find_similar_past_purchases` fonksiyonu
  - `004_seed_demo_data.sql` — demo ürünler + yorumlar + kullanıcılar
- [ ] Tabloların oluştuğunu Supabase dashboard'da doğrula
- [ ] RLS test: anon key ile sorgu yap, demo_products görünüyor mu, decisions boş mu?

**Öğleden sonra — Mock Data (MOCKDATA.md ile):**
- [ ] 6 demo ürünü SQL ile ekle
- [ ] Her ürün için 15-20 yorum hazırla:
  - Gemini'ye prompt at: "Apple Watch için %20'si pil ömründen şikayetçi 18 yorum üret"
  - JSON olarak al, SQL'e dönüştür
- [ ] 3 demo kullanıcı profili ekle
- [ ] Her demo kullanıcı için 4-6 past_purchase ekle
- [ ] 6 ürün thumbnail'ı topla:
  - Unsplash, Pexels, veya Midjourney
  - `web/public/images/demo/` klasörüne koy

**Akşam — Backend bağlantı:**
- [ ] Backend'de Supabase client'ı yapılandır
- [ ] `/api/v1/demo/products` endpoint'i — listele
- [ ] `/api/v1/demo/products/{id}` endpoint'i — tek ürün + yorumlar
- [ ] Frontend'den fetch et, çalıştığını gör

### 3.3 Gün Sonu Çıktısı
- ✅ 10 tablo oluşturulmuş, RLS aktif
- ✅ 6 ürün × 15-20 yorum yüklü
- ✅ 3 demo kullanıcı + geçmiş alışverişler yüklü
- ✅ Backend Supabase'den veri çekiyor
- ✅ Frontend backend'den veri görüyor

---

## 4. Gün 3 (15 Mayıs) — Agent Sistem Backend

### 4.1 Hedef
LangGraph cyclic flow'u kur, 7 ajanı implement et, Gemini entegrasyonunu sağla.

### 4.2 Görevler

**Sabah — LangGraph + Gemini setup:**
- [ ] LangGraph state schema (AGENT_SYSTEM.md'den)
- [ ] Gemini client wrapper (`langchain-google-genai` kullan)
- [ ] Tek bir ajanın çalıştığı POC: Product Context Agent
  - Input: ürün JSON
  - Output: structured ProductContextOutput
  - Pydantic validation çalışıyor mu?

**Öğleden sonra — Diğer ajanlar:**
- [ ] Review Risk Analyzer — yorumları al, risk skorla
- [ ] Behavior Profile Agent — past_purchases'i DB'den çek (find_similar_past_purchases ile)
- [ ] Need Analyzer — soru üret
- [ ] Need Check — skor üret
- [ ] Decision Agent — kurallı (LLM minimal), karar üret
- [ ] Tone Adapter — moda göre tonla

**Akşam — Cyclic flow:**
- [ ] LangGraph edges + conditional edge tanımla
- [ ] `should_recheck` fonksiyonu
- [ ] Tek bir test senaryosunu uçtan uca çalıştır:
  - Senaryo: Ayşe + Apple Watch
  - Beklenen: cyclic flow tetiklenmeli, Need Score < 30 çıkmalı
- [ ] Agent trace'i logla — her ajanın input/output'u görünür

### 4.3 Gün Sonu Çıktısı
- ✅ 7 ajan çalışıyor
- ✅ LangGraph cyclic flow aktif, en az 1 senaryoda tetikleniyor
- ✅ Gemini API çağrıları başarılı
- ✅ Test senaryosu uçtan uca geçiyor (terminal'de görünüyor)

### 4.4 Risk
- **Pydantic format hataları** — Gemini bazen invalid JSON döner.
- **Çözüm:** LangChain'in `with_structured_output()` method'unu kullan, retry mekanizması ekle.

---

## 5. Gün 4 (16 Mayıs) — API + Frontend Iskelet

### 5.1 Hedef
FastAPI endpoint'lerini açığa çıkar, frontend'i agent akışına bağla.

### 5.2 Görevler

**Sabah — API endpoint'leri (API.md ile):**
- [ ] `POST /decisions/analyze` — SSE streaming
  - Agent trace event'leri akıtır
  - `questions_required` event'i için akış durur
- [ ] `POST /decisions/answer-questions` — cevap alır, akış devam eder
- [ ] `GET /decisions/{id}` — tamamlanmış kararı döner
- [ ] `GET /decisions/{id}/trace` — trace döner
- [ ] CORS yapılandırması (extension + web origin'leri)
- [ ] Auth middleware (JWT validation)

**Öğleden sonra — Extension content script (EXTENSION.md ile):**
- [ ] Demo sayfasını oluştur: `/product/[id]` (Next.js'te)
- [ ] Trendyol benzeri görsel tasarım
- [ ] Mock yorumlar render et
- [ ] Extension'ı bu sayfada test et
- [ ] Scraper yaz (demo scraper) — DOM'dan ürün bilgisini al
- [ ] Floating button → DecisionPanel'i mount et

**Akşam — Decision Panel UI:**
- [ ] Mode selector component
- [ ] SSE stream'i tüket
- [ ] Agent trace'i canlı göster
- [ ] Soru-cevap akışı
- [ ] Skor kartları (3 skor görselleştirme)
- [ ] Karar mesajı

### 5.3 Gün Sonu Çıktısı
- ✅ Backend tüm endpoint'leri açık
- ✅ Extension demo sayfasında çalışıyor
- ✅ Tam akış: sayfa → tıkla → analiz → sorular → karar
- ✅ Agent trace canlı görünüyor

---

## 6. Gün 5 (17 Mayıs) — Companion Web + Auth

### 6.1 Hedef
Companion Web'in tüm sayfalarını tamamla, Google OAuth aç.

### 6.2 Görevler

**Sabah — Auth (WEB.md ile):**
- [ ] Supabase auth client wrapper (server + browser)
- [ ] `/login` sayfası — Google login butonu
- [ ] `/auth/callback` — OAuth callback handler
- [ ] Middleware — auth korumalı route'lar
- [ ] User profile auto-creation trigger (DB tarafında zaten var)

**Öğleden sonra — Dashboard sayfaları:**
- [ ] `/dashboard` — Stats overview + recent decisions
- [ ] `/dashboard/history` — karar listesi + filtreler
- [ ] `/dashboard/purchases` — past_purchases ekleme formu + liste
- [ ] `/decisions/[id]` — tek karar detayı + full agent trace
- [ ] `/dashboard/preferences` — mod, bütçe ayarları

**Akşam — Stats sayfası (DEMO için kritik):**
- [ ] `/dashboard/stats` — recharts ile grafikler
- [ ] Aylık tasarruf bar chart
- [ ] Karar dağılımı pie chart
- [ ] Behavioral insights kartları (LLM ile üretilen)
- [ ] Landing page'i finalize et

### 6.3 Gün Sonu Çıktısı
- ✅ Google OAuth çalışıyor
- ✅ Dashboard tüm sayfalar render ediyor
- ✅ Stats sayfası dolu ve etkileyici
- ✅ Decision detail sayfası agent trace gösteriyor

---

## 7. Gün 6 (18 Mayıs) — Entegrasyon + Polish

### 7.1 Hedef
Tüm parçaları birbirine bağla, bug fix, UI polish, performans optimizasyonu.

### 7.2 Görevler

**Sabah — Uçtan uca test:**
- [ ] 3 demo senaryosunu manuel test et:
  - Senaryo A: Mehmet + Laptop → Buy
  - Senaryo B: Ayşe + Watch → Wait (HERO)
  - Senaryo C: Can + La Mer → Consider Alternative
- [ ] Her senaryoda agent trace doğru mu?
- [ ] Cyclic flow Senaryo B'de tetikleniyor mu?
- [ ] Karar mesajı doğru tonda mı?

**Öğleden sonra — Polish:**
- [ ] Loading states (skeleton, spinner)
- [ ] Error states (network hatası, LLM hatası)
- [ ] Empty states (henüz karar yok, henüz alışveriş yok)
- [ ] Animasyonlar (panel slide-in, skor sayı animasyonu)
- [ ] Mobile responsive (en azından landing + dashboard)
- [ ] Dark mode (opsiyonel)

**Akşam — Performance + Fallback:**
- [ ] Backend yanıt süresi ölç — 12 saniyenin altında mı?
- [ ] Behavior Profile + Review Risk paralel mi çalışıyor?
- [ ] Demo mode fallback implement et (LLM down olursa hardcoded cevap)
- [ ] Lighthouse audit (web) — score > 90 hedef
- [ ] Bug fix listesi — kalan her şey

### 7.3 Gün Sonu Çıktısı
- ✅ 3 senaryo eksiksiz çalışıyor
- ✅ Tüm UI states (loading, error, empty) çözülmüş
- ✅ Performance hedefleri tutturulmuş
- ✅ Fallback senaryolar hazır

---

## 8. Gün 7 (19 Mayıs) — Sunum Provası

### 8.1 Hedef
Bug fix tamamla, demo video kaydı al, sunum provası yap.

### 8.2 Görevler

**Sabah — Final bug fix:**
- [ ] Gün 6'dan kalan kritik bug'ları çöz
- [ ] Demo akışında her tıklamayı test et
- [ ] Edge case'leri kontrol et:
  - Çok uzun ürün ismi
  - Yorum yokken karar
  - Network kesintisi
  - Refresh ortasında
- [ ] Final deployment (Vercel + Railway)

**Öğleden sonra — Demo hazırlık:**
- [ ] Demo kullanıcı hesabını hazırla (`ayse@demo.com`)
- [ ] Hesaba 5-10 mock karar ekle (Stats sayfası dolu görünsün)
- [ ] Sahte ürün sayfası son kontrol
- [ ] Eklenti son build'i Chrome'a yükle
- [ ] Trendyol entegrasyonunu canlı test (backup için)

**Akşam — Provalar (DEMO.md ile):**
- [ ] **Prova 1:** Akış öğrenme — süre tutma yok (~10 dk)
- [ ] **Prova 2:** Süre kontrol — 5 dakikaya sığdırma
- [ ] **Prova 3:** Sahne geçişleri akıcı mı?
- [ ] **Prova 4:** Soru-cevap pratiği (8 muhtemel soru)
- [ ] **Prova 5:** Tam genel prova — değişiklik yok
- [ ] **Demo video kaydı:** 5 dakikalık tam akış, sesli, 1080p

### 8.3 Gün Sonu Çıktısı
- ✅ Tüm sistem canlıda, stabil
- ✅ Demo videosu kayıt edildi (yedek olarak)
- ✅ Sunum 5 provanın ardından akıcı
- ✅ Q&A için hazır cevaplar oturmuş

---

## 9. Risk Tablosu (Tüm Hafta)

| Risk | Olasılık | Etki | Hangi Gün | Azaltma |
|---|---|---|---|---|
| Supabase OAuth setup zorluğu | Orta | Orta | Gün 1-4 | Email/password ile başla, OAuth Gün 4'e ertele |
| Gemini API rate limit | Orta | Yüksek | Gün 3-6 | Caching ekle, demo mode fallback |
| Pydantic + Gemini format uyumsuzluğu | Yüksek | Orta | Gün 3 | `with_structured_output` + retry |
| LangGraph cyclic edge bug | Orta | Yüksek | Gün 3 | LangGraph örnek repolarına bak, conditional edges'i izole test et |
| Extension Chrome Manifest V3 sorunu | Düşük | Yüksek | Gün 1, 4 | @crxjs/vite-plugin güncel sürüm |
| Demo'da Wi-Fi sorunu | Düşük | Çok Yüksek | Gün 7 | Video yedek + lokal versiyon |
| Süre aşımı (5 dk geçmesi) | Yüksek | Yüksek | Gün 7 | Prova, prova, prova |
| Burnout (tek geliştirici) | Yüksek | Çok Yüksek | Her gün | Günde 8 saat sınırı, 1 saat ara |

---

## 10. Günlük Checklist Template

Her gün sonunda 5 dakikalık değerlendirme yap:

```
Gün X — [Tarih]

Bugün ne tamamlandı?
- [ ] ...

Yarına ne sarktı?
- [ ] ...

Hangi sorun ortaya çıktı?
- ...

Yarın için risk azaltma?
- ...

Demo akışına etki?
- (olumlu / olumsuz / nötr)

Burnout seviyesi (1-10):
- ...

Yarın için 3 net öncelik:
1. ...
2. ...
3. ...
```

---

## 11. Yetersiz Zamanda Önceliklendirme

Eğer bir gün hedef tutturulamazsa, **scope cut** stratejisi:

### Kesinlikle olmalı (Must Have)
- Backend → LangGraph cyclic flow → 1 senaryo
- Extension → demo sayfada decision panel
- Web → Landing + 1 dashboard sayfası (Stats)
- Decision detail sayfası (agent trace gösterimi)

### Olmalı (Should Have)
- Google OAuth (E-Mail backup'lı)
- 3 senaryo (sadece HERO bile yeterli)
- History sayfası
- Mock geçmiş kararlar

### Olabilir (Nice to Have)
- Preferences sayfası
- Dark mode
- Mobile responsive
- Lighthouse 90+
- Video yedek

### V2'ye (Won't Have for hackathon)
- Gerçek Trendyol scraper'ı (sahte sayfa yeter)
- Multi-site desteği
- B2B widget
- Banka entegrasyonu

**Kritik:** "Must Have" listesi tamamlanmadan "Should Have"a geçilmez.

---

## 12. AI Ajanlara Görev Dağılımı

Hangi ajan hangi işte daha iyi:

| Görev | En İyi Ajan | Sebep |
|---|---|---|
| Backend Python (FastAPI, LangGraph) | Claude Code | Multi-file refactoring iyi |
| Frontend React component | Cursor / Copilot | Inline suggestions hızlı |
| SQL migration yazma | Claude Code veya Gemini | Schema reasoning |
| Tailwind UI polish | Cursor | Live preview |
| Demo data üretimi (yorum, profil) | Gemini | Türkçe yaratıcılık |
| Bug fix (yerinde) | Cursor | Hızlı iterasyon |
| Documentation update | Claude | Tutarlılık |
| Test yazma | Claude Code | Edge case'leri görür |

Her ajana **bağlamı doğru ver:** ilgili `docs/` dosyalarını okumasını söyle. AI ajan SPEC.md, AGENT_SYSTEM.md, API.md vs.'yi okuduğunda, çıktıları %50 daha iyi.

---

## 13. Commit ve Branch Stratejisi

```
main          ─── tüm günlerde deploy edilebilir
  ├─ day-1    ─── günlük branch
  ├─ day-2
  ├─ ...
  └─ feat/*   ─── feature branch'ler

Commit mesajları:
feat: add review risk analyzer agent
fix: handle gemini timeout in product context
docs: update AGENT_SYSTEM.md with cyclic flow details
chore: add demo data seed script
```

---

## 14. Hackathon Teslim Hazırlığı

Hackathon teslim formu için (genelde 19 Mayıs son):
- [ ] Proje adı: SepetIQ
- [ ] Kategori: E-Ticaret (veya AI Agent)
- [ ] Repo linki (public)
- [ ] Demo video (YouTube unlisted)
- [ ] Canlı demo URL'leri (Vercel + Railway)
- [ ] Eklenti install rehberi
- [ ] README.md güncel
- [ ] Takım bilgileri (tek kişi)
- [ ] Sunum slaytları (3 slayt)

---

## 15. Önemli Hatırlatmalar

- **Her gün sonunda commit + deploy.** Hiç "merge later" demek yok.
- **Mock data hayatın merkezi.** Backend olmasa bile frontend mock'larla çalışır.
- **DOCS sürekli güncel.** Bir karar değişirse, ilgili `.md` dosyası güncellenir.
- **Demo akışı kutsal.** "Bunu da ekleyelim" düşüncesi → V2'ye yaz, hackathon'a değil.
- **Prova prova prova.** Sunumun %50'si prova ile kazanılır.

---

## 16. Hafta Sonu Notu

Hackathon'dan sonra:
1. 1-2 gün dinlen
2. Geri bildirimleri topla
3. README'yi finalize et (badges, screenshots, GIF)
4. LinkedIn / Twitter postu
5. Eğer ödül kazanılırsa: ürün roadmap'ini düşünmeye başla (V2 için)

İyi şanslar. **Yapacaksın.**
