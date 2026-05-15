# DEMO.md — Hackathon Sunum Senaryosu

> 5 dakikalık jüri sunumunun **sahne sahne** akışı. Bu doküman provasız sunulmamalı.

---

## 1. Sunum Genel Stratejisi

### 1.1 Kuralın Anlamı

- **Toplam süre:** 5 dakika (sabit, aşma yok)
- **Hedef:** Jüri 3 şeyi anlasın:
  1. **Ne yapıyor?** (Anti-sales AI, e-ticaret eklentisi)
  2. **Niye farklı?** (Cyclic Intelligence + KILLER feature)
  3. **Çalışıyor mu?** (Canlı demo)

### 1.2 Süre Dağılımı

| Sahne                                  | Süre       | Hedef            |
| -------------------------------------- | ---------- | ---------------- |
| 1. Açılış — Problem                    | 30 sn      | Jüri bağlanır    |
| 2. Çözüm — DNA                         | 30 sn      | Konsept netleşir |
| 3. Canlı Demo (HERO senaryo)           | 2 dk 30 sn | "Vay be" anı     |
| 4. Teknik Vurgu (Agent Trace + KILLER) | 1 dk       | Teknik puan      |
| 5. Kapanış — V2 Vizyonu + CTA          | 30 sn      | İz bırak         |
| **Toplam**                             | **5 dk**   |                  |

### 1.3 Sunum İlkeleri

- **Slayt değil, demo:** Slaytları minimum tut. Ürünü göster.
- **Soğukkanlı ol:** Acele etme. 5 dakika uzun bir süredir.
- **Sahnele:** Her tıklama, her saniye prova edilmiş olmalı.
- **Yedeği hazır tut:** Video, screenshot, lokal version — hep hazır.

---

## 2. Sahne Sahne Akış

### Sahne 1 — Açılış (0:00 - 0:30)

**Ekran:** Trendyol ana sayfası (gerçek), "İndirim 2 saat sonra bitiyor!" banner'ı görünür halde.

**Söz:**

> "Hepimiz bunu yaşadık: Gece yarısı, indirim banner'ı, sosyal medyada bir reklam. 'Sepete ekle' butonu sayfanın 4 farklı yerinde. **Kimse sana 'almayın' demiyor.**
>
> Çünkü e-ticaretin tek hedefi: **seni satın alma anına ulaştırmak.**"

**Beden dili:** Ekrana işaret et. Sayfayı scroll et. "Son 3 ürün!" gibi unsurları vurgula.

**Kritik mesaj:** Problemi 30 saniyede hissettir.

---

### Sahne 2 — Çözüm (0:30 - 1:00)

**Ekran:** SepetIQ landing page'ine geç (`sepetiq.vercel.app`).

**Söz:**

> "SepetIQ, e-ticaretin 'Satın Al' baskısına karşı, tüketicinin ilk **'Düşün' butonu.**
>
> Sana ürün önermiyor. Almak istediğin ürünü gerçekten alıp almaman gerektiğini **3 skor ile sorguluyor:**
>
> - Product Fit Score — bu ürün sana uygun mu?
> - Review Risk Score — yorumlar güven veriyor mu?
> - Need Score — gerçekten ihtiyacın var mı?
>
> Şimdi gerçek bir senaryoda göstereyim."

**Beden dili:** Landing page'deki 3 skor görseline işaret et. Hızlı geç — 30 saniye.

---

### Sahne 3 — Canlı Demo: HERO Senaryosu (1:00 - 3:30)

Bu sahnede **Ayşe + Apple Watch + Wait** senaryosunu (HERO) sahneliyoruz.

**3.1 Hazırlık (Sahne öncesi yapılmış olmalı):**

- Tarayıcıda Ayşe'nin hesabıyla giriş yapılmış
- Sistem saati 22:30 olarak ayarlanmış (veya backend'de force)
- Sahte e-ticaret sayfası açık: `sepetiq.vercel.app/product/demo_watch_apple`
- Eklenti yüklü ve aktif

**3.2 Akış:**

**0:00 (sahne içi) — Sayfayı göster.**

> "Ayşe, 28 yaşında dijital pazarlama uzmanı. Gece 22:30, sosyal medyadan gelen bir reklamla Apple Watch sayfasında. İndirim son saatlerinde."

**Ekran:** Sayfa görünür — Apple Watch, 18.999 TL, "Sepete Ekle" butonu.

**0:15 — Floating button belirir.**

> "İşte tam burada SepetIQ devreye giriyor."

**Eklentinin floating button'una tıkla.** Panel açılır.

**0:25 — Mod seçimi.**

> "Ayşe disiplinli mod kullanıyor — dürtüsel alışveriş kontrolü istiyor."

**Disiplinli mod seçili (varsayılan). "Analizi Başlat" butonuna tıkla.**

**0:35 — Agent trace akışı başlar.**

> "Şimdi 7 ajan paralel olarak çalışıyor. Sağ panelde gerçek zamanlı izleyebilirsiniz."

**Ekran:** Sağ panelde trace akıyor:

- ✓ Product Context Agent (1.2s)
- ✓ Review Risk Analyzer (2.3s) — "⚠ Risk tetiklendi: pil ömrü"
- ✓ Behavior Profile Agent (1.8s) — "🔥 Benzer ürün: 6 ay önce, kullanılmamış"

**1:05 — Sorular gelir.**

> "Sistem dinamik sorular üretiyor. Standart 3 sorudan farklı olarak..."

**Ekran:** Sorular:

1. "Bu ürünü almaya nasıl karar verdin?" → "Sosyal medyada gördüm, indirimi var"
2. "Aynı işi gören bir ürünün var mı?" → "Var, Samsung Galaxy Watch'um var"
3. "Pil ömrü senin için kritik mi?" → "Hayır" (← bu soru cyclic flow'dan geldi)

> "...bu son soru klasik bir akışta yok. Review Agent pil sorununu tespit ettikten sonra, Need Agent'a sinyal verdi: 'Bu kullanıcıya pil ömrüyle ilgili sor.' **İşte bizim 'Cyclic Intelligence' dediğimiz şey bu — ajanlar birbirini tetikliyor.**"

**Ekran:** Trace panelinde "↻ CYCLIC FLOW TETİKLENDİ" göstergesi vurgulanır.

**2:00 — Skorlar ve karar çıkar.**

```
┌─────────────────────────────────────┐
│  Product Fit:    72 / 100           │
│  Review Risk:    65 / 100           │
│  Need Score:     18 / 100  ❌       │
├─────────────────────────────────────┤
│  KARAR: BEKLE                       │
│                                     │
│  "Disiplinli Mod aktif. Geç saatte, │
│  indirim sayfasından geliyorsun ve  │
│  benzer bir saatin geçmişte         │
│  kullanılmadan kaldı. Bu kararı     │
│  bugün almıyoruz. Yarın aynı saatte │
│  tekrar değerlendir."               │
└─────────────────────────────────────┘
```

**2:15 — Vurgulama anı.**

> "Dikkat edin: ürün teknik olarak uygun (Fit: 72). Yorumlar fena değil (Risk: 65). Ama **Need Score: 18.**
>
> Çünkü Behavior Profile Agent, Ayşe'nin **geçmişte aldığı iki akıllı saatten ikisini de kullanmadığını** tespit etti. İşte SepetIQ'nun farkı: ChatGPT bunu bilmez. SepetIQ **biliyor ve hatırlatıyor.**"

**3.3 Beden Dili:**

- Yavaş ve net konuş
- Need Score: 18'i 2 saniye bekleterek vurgula
- Trace panelindeki "similar past purchase" satırını işaretle

---

### Sahne 4 — Teknik Vurgu (3:30 - 4:30)

**4.1 Karar detay sayfasına geç.**

"Daha Detaylı Analiz" butonuna tıkla → `/decisions/[id]` sayfası açılır.

> "Şimdi karar arkasındaki tüm akışı görebilirsiniz."

**Ekran:** Tam agent trace görünür — 7 ajan, cyclic loop, sürelerle.

**4.2 Teknik mimari özeti.**

> "**Backend:** Python FastAPI, **agent orkestrasyonu:** LangGraph, **LLM:** Gemini 2.5 Flash. Toplam analiz süresi: **9.5 saniye.**
>
> Tüm ajanlar Pydantic ile yapılandırılmış çıktı üretiyor — saf metin değil, **deterministik veri.**"

**Önemli:** Bu kısımda **slayda geçilebilir** — 1 slayt teknik mimari diyagramı.

**4.3 KILLER Feature spotlight.**

**Ekran:** Stats sayfasına geç (`/dashboard/stats`).

> "Ve SepetIQ'nun en güçlü özelliği: **geçmiş alışveriş kıyaslaması.**
>
> Ayşe'nin verisinde sistem şunu gördü: 6 ay önce Samsung Galaxy Watch, 1 yıl önce Apple Watch Series 9 — ikisi de hiç kullanılmadı.
>
> Bu, geleneksel bir öneri sisteminin yapamayacağı şey: **kullanıcının kendi geçmişine karşı dürüst olması.**"

**Ekran:** Stats grafiklerinden "Behavioral Insights" kartına işaret et:

- "En çok gece (22-02) alışveriş yapmaya çalışıyorsun"
- "İndirim baskısı en güçlü tetikleyicin"

---

### Sahne 5 — Kapanış (4:30 - 5:00)

**5.1 V2 Vizyonu.**

> "Bu MVP, hackathon süresinde geliştirildi. Üretim planında:
>
> - 5+ e-ticaret sitesi desteği
> - Sahte yorum tespiti
> - Banka ekstresi entegrasyonu
> - Aile/grup hesapları"

**5.2 Çağrı (Call to Action).**

> "SepetIQ, e-ticaretin 'sat' baskısına karşı tüketicinin ilk **bilinçli karar aracı.**
>
> İade ekonomisini küçültür, tüketici güvenini büyütür, finansal sağlığı destekler.
>
> Teşekkür ederim, sorularınızı bekliyorum."

**Beden dili:** Hafifçe gülümse, eli aşağı indir, sessizliği bırak.

---

## 3. Slayt Desteği (Minimum)

Demo öncesi/arası 3 slayt kullanılabilir:

### Slayt 1 — Açılış (5 saniye)

- Sadece logo + tagline: "SepetIQ — Bilinçli Alışveriş Asistanı"
- Demo'ya geçmeden önce

### Slayt 2 — Teknik Mimari (10 saniye, sahne 4'te)

- Diyagram: Browser Extension → FastAPI → LangGraph (7 agents) → Gemini
- Yazısal liste: "Python, FastAPI, LangGraph, Pydantic, Supabase, Vercel, Railway"

### Slayt 3 — Kapanış (10 saniye)

- "İade ekonomisini küçültür, tüketici güvenini büyütür"
- "SepetIQ Team — [GitHub linki]"

**Toplam slayt:** 3 (üç). Daha fazlası demo zamanını yer.

---

## 4. Demo Riski Yönetimi

### 4.1 Olası Sorunlar

| Sorun                        | Olasılık | Etki       | Azaltma                            |
| ---------------------------- | -------- | ---------- | ---------------------------------- |
| Gemini API down              | Düşük    | Çok yüksek | Hardcoded fallback senaryosu hazır |
| Backend timeout              | Orta     | Yüksek     | Lokalden de çalıştırılabilir hazır |
| Eklenti scraper hatası       | Orta     | Orta       | Sahte demo sayfası kontrolde       |
| Wi-Fi kesilirse              | Düşük    | Çok yüksek | Video kaydı yedek                  |
| Demo kullanıcı session düşer | Düşük    | Düşük      | Önceden yeniden login              |

### 4.2 Hardcoded Fallback Senaryoları

Eğer LLM çağrıları başarısız olursa, backend bir flag ile "demo modu" çalışır:

```python
if DEMO_FALLBACK_ENABLED and not llm_available:
    return hardcoded_scenarios[product_id][user_id]
```

3 senaryonun tümü için (Mehmet+Laptop, Ayşe+Watch, Can+La Mer) **statik cevaplar** hazır — kimse fark etmez.

### 4.3 Video Yedek Plan

5 dakikalık tam demo videosu **önceden çekilmiş** olmalı:

- 1080p, screen recording
- Sesli anlatım (sunucu kendi sesi)
- Sahne 3'ün HERO senaryosu eksiksiz
- Dosya yolu: `/demo/sepetiq-demo-backup.mp4`

Eğer canlı demo çökerse: "Sistem geçici bir sorun yaşıyor, kayıttan devam edelim" → videoyu oynat. Jüri farkı anlamaz.

### 4.4 Lokal Çalıştırma Planı

İnternet tamamen kesilirse:

- Backend lokalde (`localhost:8000`) çalışır
- Frontend lokalde (`localhost:3000`)
- Demo sayfası lokalden açılır
- Gemini API yerine: cached responses

**Hazırlık:** Demo öncesi lokal versiyonu test et, terminal pencereleri hazır olsun.

---

## 5. Prova Notları

### 5.1 Prova Sayısı

**Minimum 5 prova:**

1. **Prova 1:** Akış öğrenme — süre tutma yok
2. **Prova 2:** Süre kontrol — 5 dakikaya sığdırma
3. **Prova 3:** Sahne geçişleri — akıcılık
4. **Prova 4:** Soru-cevap pratiği (bkz. Sahne 6)
5. **Prova 5:** Tam genel prova — değişiklik yok

### 5.2 Konuşma Provası

Söz metni **ezbere okunmamalı.** Doğal akmalı. Strateji:

- Her sahne için 3-5 anahtar cümle ezberle
- Bağlantıları doğaçla
- Önemli sayıları (3 skor, 18, 65, 72) net telaffuz et
- Hız: dakikada ~140 kelime (rahat tempo)

### 5.3 Klavye/Mouse Kontrolü

- Tüm tıklamaları **mouse ile** yap (klavye shortcut'ları kaçırılabilir)
- Hızlı tıklama yok — her tıklamayı 1 saniye beklet ki jüri görebilsin
- Sekmeleri **önceden açık tut**, demo sırasında URL yazma

---

## 6. Soru-Cevap Hazırlığı

Sunum sonrası muhtemel sorular ve hazır cevaplar:

### S1: "Bunu ChatGPT'ye sorabilir miyim?"

> "Soru doğru, ama 3 farkı var: **(1) Context Injection** — ChatGPT'ye ürünü, fiyatı, yorumları manuel anlatman gerekir; SepetIQ otomatik tarar. **(2) Structured Output** — ChatGPT hikaye anlatır, SepetIQ skor üretir. **(3) Cyclic Intelligence** — ajanlar birbirini tetikleyerek dinamik soru üretir. ChatGPT bunu yapmaz."

### S2: "Veri gizliliği?"

> "Kullanıcı verisi Supabase'de Row Level Security ile korunuyor — her kullanıcı sadece kendi verisine erişebiliyor. Gemini'ye gönderilen veri anonim — kullanıcı kimliği değil sadece ürün+geçmiş kategorisi. Production'da Gemini Tier 1'e geçerek veri kullanımı opt-out edilir."

### S3: "Gelir modeli?"

> "Freemium: Günde 5 ücretsiz karar, premium kullanıcılar (ayda 50 TL) sınırsız + detaylı stats + aile hesabı. Affiliate komisyonu **almıyoruz** — bu bizim DNA'mıza aykırı."

### S4: "E-ticaret siteleri neden destekler?"

> "Hedef B2C, B2B değil. Ama uzun vadede: yanlış satın alımı azaltır → iade maliyeti düşer. The Return Economy büyük bir sorun. Sites belki bir gün B2B widget versiyonu satın alır."

### S5: "Neden Gemini, GPT değil?"

> "Hackathon kuralı Gemini'yi zorunlu kılıyor. Ayrıca Gemini 2.5 Flash ücretsiz katmanı bu pilot için yeterli: 1500 istek/gün, 1M token/dakika. Üretim için multi-LLM router yapılabilir."

### S6: "Cyclic flow gerçekten farklı mı?"

> "Klasik akış doğrusal: A→B→C→D. Bizim akışımız: Risk Agent bir bulgu tespit ederse, Need Agent'a sinyal gönderir, Need Agent dinamik soru üretir, Need Check yeniden çalışır. **LangGraph'ın conditional edges özelliğiyle** implement edildi. Karar matrisi tek geçişlik değil — döngüsel."

### S7: "Disiplinli mod kullanıcıyı suçluyor mu?"

> "Hayır — etik sınırlarımızda 'suçluluk üretmek' yok. Ton kuralı: 'Bu karar şu an ihtiyaçtan çok anlık istek gibi görünüyor' — saygılı ve net. 'Yine gereksiz bir şey alacaksın' yok."

### S8: "Sahte ürün sayfası mı kullandın?"

> "Hem sahte hem gerçek var. Demo'da risk almamak için sahte sayfayı tercih ettik — tasarımı, yorumları, fiyatları kontrolümüzde. Ama eklenti Trendyol ve Hepsiburada selector'larıyla da yazıldı — manifest'te bu siteler tanımlı."

---

## 7. Sahne Arası Notlar

### 7.1 Sunucu pozisyonu

- Ekrana yan dur, jüriye yarı dön
- Eli ekran ve jüri arasında kullan (işaret etme)
- Mikrofon (varsa) sabit pozisyon — gezme

### 7.2 Görsel hijyen

- Tarayıcı sekme sayısı: maksimum 3
- Bookmark bar: kapalı
- Notifications: tamamen kapalı (telefon dahil)
- Ekran çözünürlüğü: 1080p, tarayıcı zoom %110

### 7.3 Sahne aksesuarları

- Su şişesi (yakında)
- Yedek laptop (mümkünse, başka kişide)
- Yedek HDMI kablo
- Yedek mouse (laptop trackpad'i güvensiz)

---

## 8. Sunum Sonrası

### 8.1 Hemen sonrası (jüri yanından çıkar çıkmaz)

- Notları al: hangi sorular geldi, ne işe yaramadı
- Diğer takım sunumlarını dinle (varsa fırsat)
- Sosyal medya postu (proje hashtag'iyle)

### 8.2 Demo videoyu yayınla

- YouTube unlisted
- GitHub README'ye ekle
- LinkedIn paylaşımı

### 8.3 Geri bildirim

- Hackathon Discord/Slack'inde diğer takımlarla bağlantı kur
- Mentor varsa görüşme talep et
- Eksik kalan yerleri not et (v2 planı için)
