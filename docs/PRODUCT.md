# PRODUCT.md — Ürün Vizyonu ve Konumlandırma

> Bu doküman SepetIQ'nun **neden var olduğunu** anlatır. Kod yazmadan önce buradaki konumlandırmayı içselleştir.

---

## 1. Problem Tanımı

E-ticaret platformları kullanıcıyı **satın almaya itmek** üzere optimize edilmiştir:

- "Son 3 ürün!"
- "İndirim 2 saat sonra bitiyor!"
- "Bu hafta en çok satılan!"
- "Sepete ekle" butonu sayfanın 4 farklı yerinde
- Bildirimler, popup'lar, hatırlatmalar

Sonuç: Kullanıcılar düzenli olarak **pişmanlık duyduğu** alışverişler yapıyor. İade ekonomisi (Return Economy) büyük bir maliyet kalemi. Tüketici güveni eriyor.

**Kimse "almayın" demiyor.**

---

## 2. SepetIQ'nun Cevabı

SepetIQ, e-ticaretin "satın al" baskısına karşı koyan **anti-sales AI**'dır.

Üç temel sorgulama yapar:

1. **Product Fit:** Bu ürün gerçekten ihtiyacına uygun mu? (Teknik özellikler, kullanım amacı)
2. **Review Risk:** Yorumlar gerçekten güven veriyor mu? (Şikâyet kalıpları, gizli riskler)
3. **Need Score:** Bu ürünü gerçekten alman gerekiyor mu? (Gerçek ihtiyaç mı, dürtü mü?)

Sonuç: Yapılandırılmış (structured) bir karar — **Al, Şartlı Al, Bekle, Alma, Alternatif Düşün.**

---

## 3. DNA İlkesi

> **SepetIQ ne alacağını söylemez — almak istediğin ürünü gerçekten alıp almaman gerektiğini sorgular.**

Bu cümle her tasarım, kod ve sunum kararının kontrol noktasıdır. Eğer bir feature bu cümle ile çelişiyorsa, **o feature SepetIQ'ya ait değildir.**

---

## 4. Pitch Cümleleri (Farklı Bağlamlar İçin)

### Açılış pitch (30 saniye sunum):
> "E-ticaretin 'Satın Al' baskısına karşı, tüketicinin ilk 'Düşün' butonu: SepetIQ."

### Tek cümle pitch:
> "SepetIQ, almak üzere olduğun ürünü gerçekten alıp almaman gerektiğini sorgulayan agentic AI eklentisidir."

### Felsefe cümlesi:
> "Friction by Design — bilinçli kararlar için optimum sürtünme."

### Teknik fark cümlesi:
> "Cyclic Intelligence — doğrusal değil, döngüsel ajan akışı."

### Metafor (geniş kitle için):
> "Apple Health adımlarınızı sayar, SepetIQ alışveriş kararlarınızı sayar. Her ikisi de uzun vadeli sağlık için."

---

## 5. Kullanıcı Persona'ları (Demo İçin)

### Persona 1 — Mehmet (Yazılım Öğrencisi)
- 21 yaşında, Bilgisayar Mühendisliği 3. sınıf
- Aylık 5.000 TL bütçeli
- Mevcut laptop'u 5 yaşında, freelance iş başlatacak
- Disiplinli alışverişçi — gerekli olunca alır
- Demo'da: "Al" kararı senaryosu

### Persona 2 — Ayşe (Genç Profesyonel)
- 28 yaşında, dijital pazarlama uzmanı
- İndirim ve sosyal medyadan kolay etkilenir
- Geçmişte alıp kullanmadığı 3-4 ürün var
- Dürtüsel alışveriş eğilimi yüksek
- Demo'da: "Bekle" veya "Alma" kararı senaryosu

### Persona 3 — Can (Bütçe Hassas)
- 35 yaşında, iki çocuk babası
- Aylık bütçesi belirli, kontrollü alışveriş yapar
- "Almalı mıyım?" sorusunu zaten kendine soruyor
- Disiplinli mod kullanıcısı
- Demo'da: Geçmiş alışveriş kıyaslaması ile detaylı analiz

---

## 6. Mod Sistemi (Kişiselleştirme)

Kullanıcı kendi alışveriş kontrol modunu seçer:

### Mod 1 — Yumuşak Danışman
- Nazik öneriler verir
- Karar eşiği esnek
- "Al" demek nispeten kolay
- Hedef kullanıcı: Zaten disiplinli, sadece ekstra bir göz isteyen kullanıcı

### Mod 2 — Dengeli Asistan (Varsayılan)
- Artı/eksi analizi yapar
- Standart karar eşiği
- Mantıklı ve dengeli ton
- Hedef kullanıcı: Genel kullanıcı

### Mod 3 — Disiplinli Mod
- Dürtüsel alışverişe karşı daha net konuşur
- "Al" demek daha zor — yüksek eşik
- Saygılı ama kararlı ton: "24 saat bekle", "Yarın hala istiyor musun?"
- Hedef kullanıcı: Dürtüsel alışveriş kontrolü isteyen

**Önemli ton kuralı:**
- ✅ "Bu karar şu an ihtiyaçtan çok anlık istek gibi görünüyor."
- ❌ "Yine gereksiz bir şey almak üzeresin."

---

## 7. Ana Skorlar

Detaylı hesaplama için [SCORING.md](./SCORING.md)'a bakın.

### Product Fit Score (0-100)
Ürün teknik olarak kullanıcının ihtiyacına uygun mu?

### Review Risk Score (0-100)
Yorumlar güven veriyor mu? Saklı riskler var mı?
(NOT: Yüksek değer "düşük risk" anlamına gelir — yani "Review Confidence" gibi düşün)

### Need Score (0-100)
Kullanıcının bu ürünü gerçekten alma ihtiyacı var mı?

### Karar Çıkışı:
- 70+ ortalama, Need > 60 → **Al**
- 50-70 arası → **Şartlı Al**
- Need < 40 → **Bekle** veya **Alma** (moda bağlı)
- Fit < 30 → **Alternatif Düşün**

---

## 8. "E-ticaret Sitesi Neden Bunu Kullansın?" Cevabı

Bu jürinin sorabileceği en sert sorudur. Hazır cevap:

**Hedef kitle B2C, B2B değil.** SepetIQ son kullanıcıya satılıyor (eklenti). E-ticaret sitelerini ikna etmemiz gerekmiyor.

**Ama uzun vadede:**
- The Return Economy (İade Ekonomisi): Yanlış satın alımı azaltır → iade maliyeti düşer
- Brand Loyalty (Marka Güveni): "Bilinçli müşteri" kazanır, LTV (Lifetime Value — Müşteri Yaşam Boyu Değeri) artar
- Data Intelligence: Anonim agregat — neden alıp vazgeçildi? Pazar araştırması verisi

---

## 9. Anti-ChatGPT Argümanı

"Bunu ChatGPT'ye de sorabilirim, niye SepetIQ?" sorusuna 3 katmanlı cevap:

### 1. Context Injection (Bağlam Enjeksiyonu)
ChatGPT sana sormadan ne ürünü, hangi fiyatı, hangi yorumları bilemez. SepetIQ eklenti seviyesinde tüm bağlamı **otomatik** toplar. Sıfır prompt mühendisliği.

### 2. Structured Output (Yapılandırılmış Çıktı)
LLM'ler hikaye anlatır. SepetIQ **skor üretir.** Karar matrisi sayesinde "neden almamalıyım?" sorusuna **veriye dayalı (data-driven)** cevap verir.

### 3. Cyclic Intelligence (Döngüsel Zeka)
ChatGPT tek bir cevap üretir. SepetIQ'da Review Agent bir risk bulursa, Need Agent'ı tetikleyip kullanıcıya o riskle ilgili ek soru sorduruyor. Bu **döngüsel bir zeka**, basit bir metin tamamlama değil.

---

## 10. Etik Sınırlar

SepetIQ'nun **yapmadığı** şeyler:

- ❌ Psikolojik teşhis koymaz ("Sen bağımlısın")
- ❌ Suçluluk duygusu üretmez ("Yine boşa harcayacaksın")
- ❌ Kullanıcıyı aşağılamaz
- ❌ Karar zorlamaz — son söz kullanıcınındır
- ❌ Kullanıcı verisini izinsiz kullanmaz
- ❌ E-ticaret sitelerinden komisyon almaz (gelir modelinde affiliate yok)

SepetIQ **yapar**:

- ✅ Kullanıcıya ayna tutar
- ✅ Yapılandırılmış veri sunar
- ✅ Otonomi hissini korur
- ✅ Saygılı ve destekleyici ton kullanır
- ✅ Şeffaf kararlar verir (agent trace ile)

---

## 11. V2 Vizyonu (Sunumda Bahsedilecek)

Hackathon MVP'sinde yok ama gelecek planları var:

- Browser extension'ın 5+ siteyi desteklemesi (Trendyol, Hepsiburada, Amazon, n11, Pazarama)
- Fake Review Detection (Sahte Yorum Tespiti) modülü
- Banka ekstre yükleyerek otomatik finansal analiz
- Aile/grup hesapları (eş+çocuk ortak bütçe)
- Aylık alışveriş sağlığı raporu
- B2B widget versiyonu (`<sepetiq-widget>` web component)
