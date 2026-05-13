# MOCKDATA.md — Demo Veri Tasarımı

> Hackathon demo'sunun zenginliği bu dökümandaki veriden gelir. AI ajan üretiminden önce **manuel olarak** kurgulanmalı.

---

## 1. Veri Stratejisi

**Üç katmanlı veri:**

1. **Demo ürünleri:** `demo_products` tablosu — 6 ürün (Elektronik + Kozmetik)
2. **Demo yorumları:** `demo_reviews` tablosu — Her ürün için 15-20 yorum
3. **Demo kullanıcı profilleri:** `demo_user_profiles` tablosu — 3 hazır kullanıcı + geçmiş alışverişleri

**Amaç:** Demo sırasında **her şey önceden hazırlanmış** olmalı. Demo sırasında veri girmeye çalışmak risktir.

---

## 2. Demo Ürünler

### 2.1 Elektronik Kategorisi

#### Ürün 1: ASUS ROG Strix G15 Gaming Laptop

```json
{
  "id": "demo_laptop_gaming",
  "name": "ASUS ROG Strix G15 Gaming Laptop",
  "category": "electronics",
  "subcategory": "laptop",
  "price": 35999.00,
  "thumbnail_url": "/images/demo/laptop-gaming.jpg",
  "brand": "ASUS",
  "demo_scenario": "buy",
  "technical_specs": {
    "processor": "AMD Ryzen 9 7945HX",
    "ram": "32GB DDR5",
    "storage": "1TB NVMe SSD",
    "graphics": "NVIDIA RTX 4070 8GB",
    "display": "15.6\" QHD 240Hz",
    "battery": "90Wh",
    "weight": "2.5 kg"
  },
  "description": "Profesyonel oyun ve geliştirme için yüksek performanslı laptop. Yoğun multitasking, AI iş yükü ve oyun performansı için optimize edilmiş."
}
```

**Demo Senaryosu:** Mehmet (yazılım öğrencisi) için → **Buy** kararı

---

#### Ürün 2: Apple Watch Series 10

```json
{
  "id": "demo_watch_apple",
  "name": "Apple Watch Series 10 GPS 46mm",
  "category": "electronics",
  "subcategory": "smartwatch",
  "price": 18999.00,
  "thumbnail_url": "/images/demo/watch-apple.jpg",
  "brand": "Apple",
  "demo_scenario": "wait",
  "technical_specs": {
    "display": "1.96\" OLED",
    "battery_life": "18 saat",
    "water_resistance": "50m",
    "connectivity": "GPS, Bluetooth 5.3",
    "sensors": "Kalp ritmi, EKG, SpO2, Sıcaklık",
    "weight": "36g"
  },
  "description": "Sağlık ve fitness takibi için akıllı saat. Apple ekosistemiyle tam entegrasyon."
}
```

**Demo Senaryosu:** Ayşe (dürtüsel alışverişçi) için → **Wait** veya **Don't Buy**

---

#### Ürün 3: Sony WH-1000XM5 Kulaklık

```json
{
  "id": "demo_headphone_sony",
  "name": "Sony WH-1000XM5 Kablosuz Kulaklık",
  "category": "electronics",
  "subcategory": "headphone",
  "price": 12499.00,
  "thumbnail_url": "/images/demo/headphone-sony.jpg",
  "brand": "Sony",
  "demo_scenario": "conditional_buy",
  "technical_specs": {
    "type": "Over-ear",
    "noise_cancellation": "Aktif (ANC)",
    "battery_life": "30 saat",
    "connectivity": "Bluetooth 5.2, USB-C",
    "weight": "250g"
  },
  "description": "Endüstri lideri gürültü engelleme özellikli premium kulaklık."
}
```

---

### 2.2 Kozmetik Kategorisi

#### Ürün 4: La Mer Crème de la Mer Nemlendirici

```json
{
  "id": "demo_cream_lamer",
  "name": "La Mer Crème de la Mer Nemlendirici 60ml",
  "category": "cosmetics",
  "subcategory": "moisturizer",
  "price": 14999.00,
  "thumbnail_url": "/images/demo/cream-lamer.jpg",
  "brand": "La Mer",
  "demo_scenario": "consider_alternative",
  "technical_specs": {
    "size": "60ml",
    "skin_type": "Tüm cilt tipleri",
    "key_ingredients": "Miracle Broth, Lime Tea, Sea Kelp",
    "spf": "Yok",
    "vegan": false
  },
  "description": "Lüks segment cilt bakım kremi. Hücre yenileme ve derin nemlendirme iddiası."
}
```

**Demo Senaryosu:** Bütçe duyarlı kullanıcı için → **Consider Alternative**

---

#### Ürün 5: The Ordinary Niacinamide 10% + Zinc 1%

```json
{
  "id": "demo_serum_ordinary",
  "name": "The Ordinary Niacinamide 10% + Zinc 1% Serum",
  "category": "cosmetics",
  "subcategory": "serum",
  "price": 350.00,
  "thumbnail_url": "/images/demo/serum-ordinary.jpg",
  "brand": "The Ordinary",
  "demo_scenario": "buy",
  "technical_specs": {
    "size": "30ml",
    "skin_type": "Yağlı, akneye eğilimli",
    "key_ingredients": "Niacinamide, Zinc",
    "vegan": true
  },
  "description": "Gözenek görünümünü azaltır, yağ dengesini sağlar."
}
```

---

#### Ürün 6: Dyson Airwrap Multi-Styler

```json
{
  "id": "demo_dyson_airwrap",
  "name": "Dyson Airwrap Multi-Styler Complete",
  "category": "cosmetics",
  "subcategory": "hair_tool",
  "price": 24999.00,
  "thumbnail_url": "/images/demo/dyson-airwrap.jpg",
  "brand": "Dyson",
  "demo_scenario": "wait",
  "technical_specs": {
    "attachments": "8 başlık",
    "technology": "Coanda Hava Akımı",
    "warranty": "2 yıl",
    "weight": "660g"
  },
  "description": "Çoklu saç şekillendirme aleti. Saç türüne göre 8 farklı başlık."
}
```

**Demo Senaryosu:** "İndirim baskısı" + benzer ürün geçmişi → **Wait**

---

## 3. Demo Yorumları

Her ürün için **15-20 yorum.** Yorumlar **kasıtlı olarak çeşitlendirilmiş** olmalı — bazı pozitif, bazı negatif, bazı risk içeren.

### 3.1 Yorum Strateji Tablosu

| Ürün | Pozitif % | Negatif % | Risk Vurgulu % |
|---|---|---|---|
| Gaming Laptop | %70 | %20 | %10 (ısınma) |
| Apple Watch | %60 | %25 | %15 (pil ömrü) |
| Sony Kulaklık | %75 | %15 | %10 (kulak ağrısı) |
| La Mer Krem | %50 | %30 | %20 (fiyat-değer) |
| Niacinamide | %85 | %10 | %5 |
| Dyson Airwrap | %65 | %20 | %15 (öğrenme eğrisi) |

### 3.2 Örnek Yorumlar (Apple Watch)

```json
[
  {
    "rating": 5,
    "text": "3 aydır kullanıyorum, ekran kalitesi muhteşem. Fitness takibi çok hassas.",
    "date": "2026-04-15",
    "verified_buyer": true
  },
  {
    "rating": 4,
    "text": "Genel olarak memnunum ama pil ömrü maalesef 1 günü zor buluyor. Eskiden 2 gün giderdi.",
    "date": "2026-04-12",
    "verified_buyer": true
  },
  {
    "rating": 3,
    "text": "Pil ömrü beklediğimden kısa. Sürekli şarj etmek zorunda kalıyorum, biraz can sıkıcı.",
    "date": "2026-04-08",
    "verified_buyer": true
  },
  {
    "rating": 2,
    "text": "Pil bir günü bile zor götürüyor. Always-on özelliği kapalıyken bile sorun yaşıyorum.",
    "date": "2026-04-05",
    "verified_buyer": true
  },
  {
    "rating": 5,
    "text": "Apple ekosistemi varsa kesinlikle al. Mac, iPhone ile entegrasyonu kusursuz.",
    "date": "2026-04-01",
    "verified_buyer": true
  },
  {
    "rating": 4,
    "text": "EKG özelliği işime yarıyor. Tek eksiği pil. Bir günden fazla beklemiyorum.",
    "date": "2026-03-28",
    "verified_buyer": true
  },
  {
    "rating": 5,
    "text": "Yüzme antrenmanlarında harika. 50m su dayanımı gerçekten çalışıyor.",
    "date": "2026-03-25",
    "verified_buyer": true
  },
  {
    "rating": 3,
    "text": "Önceki seriden büyük bir fark yok. Üst modelden gelmeyenler için iyi.",
    "date": "2026-03-20",
    "verified_buyer": true
  }
]
```

**Önemli:** Pil ömrü şikayeti **bilinçli olarak %20+** yorumda geçiyor. Bu, Review Risk Agent'ın `triggers_need_recheck=True` üretmesini sağlar → cyclic flow tetiklenir.

---

## 4. Demo Kullanıcı Profilleri

### 4.1 Mehmet — Yazılım Öğrencisi

```json
{
  "id": "demo_mehmet_student",
  "display_name": "Mehmet K.",
  "avatar_url": "/images/demo/avatar-mehmet.jpg",
  "age": 21,
  "occupation": "Bilgisayar Mühendisliği Öğrencisi",
  "persona_description": "Disiplinli alışverişçi, gerekli olunca alır. Teknik bilgi yüksek.",
  "default_mode": "balanced",
  "monthly_budget": 5000.00,
  "behavioral_traits": ["researcher", "controlled"],
  
  "past_purchases": [
    {
      "product_name": "Logitech MX Master 3 Mouse",
      "category": "electronics",
      "subcategory": "mouse",
      "price": 2200.00,
      "purchase_date": "2025-09-15",
      "usage_frequency": "daily",
      "satisfaction": "satisfied"
    },
    {
      "product_name": "Keychron K8 Klavye",
      "category": "electronics",
      "subcategory": "keyboard",
      "price": 3500.00,
      "purchase_date": "2025-08-20",
      "usage_frequency": "daily",
      "satisfaction": "satisfied"
    },
    {
      "product_name": "Samsung Galaxy Buds2 Pro",
      "category": "electronics",
      "subcategory": "headphone",
      "price": 4200.00,
      "purchase_date": "2025-06-10",
      "usage_frequency": "often",
      "satisfaction": "satisfied"
    },
    {
      "product_name": "MacBook Pro M1 13\" (2020)",
      "category": "electronics",
      "subcategory": "laptop",
      "price": 18000.00,
      "purchase_date": "2021-09-01",
      "usage_frequency": "daily",
      "satisfaction": "satisfied",
      "notes": "5 yıllık, artık freelance iş için yetersiz kalıyor"
    }
  ]
}
```

**Demo Akışında:** Mehmet ASUS ROG laptop sayfasına girer → SepetIQ analiz eder → tüm sinyaller "Al" diyor → **Buy** kararı.

---

### 4.2 Ayşe — Genç Profesyonel (Dürtüsel)

```json
{
  "id": "demo_ayse_impulsive",
  "display_name": "Ayşe Y.",
  "avatar_url": "/images/demo/avatar-ayse.jpg",
  "age": 28,
  "occupation": "Dijital Pazarlama Uzmanı",
  "persona_description": "İndirim ve sosyal medyadan kolay etkilenir. Geç saatlerde alışveriş yapar.",
  "default_mode": "strict",
  "monthly_budget": 4000.00,
  "behavioral_traits": ["impulsive", "discount_driven", "late_night_shopper"],
  
  "past_purchases": [
    {
      "product_name": "Samsung Galaxy Watch 5",
      "category": "electronics",
      "subcategory": "smartwatch",
      "price": 8500.00,
      "purchase_date": "2025-11-20",
      "usage_frequency": "rarely",
      "satisfaction": "regretted",
      "notes": "İlk hafta heyecanla kullandım, sonra bıraktım"
    },
    {
      "product_name": "Apple Watch Series 9",
      "category": "electronics",
      "subcategory": "smartwatch",
      "price": 12000.00,
      "purchase_date": "2024-12-25",
      "usage_frequency": "rarely",
      "satisfaction": "regretted",
      "notes": "Yılbaşı indirimi heyecanıyla almışım, sonra Samsung aldım"
    },
    {
      "product_name": "Dyson V11 Vacuum",
      "category": "electronics",
      "subcategory": "vacuum",
      "price": 15000.00,
      "purchase_date": "2025-03-12",
      "usage_frequency": "sometimes",
      "satisfaction": "neutral"
    },
    {
      "product_name": "Estée Lauder Advanced Night Repair",
      "category": "cosmetics",
      "subcategory": "serum",
      "price": 3500.00,
      "purchase_date": "2025-10-30",
      "usage_frequency": "often",
      "satisfaction": "satisfied"
    },
    {
      "product_name": "Charlotte Tilbury Magic Cream",
      "category": "cosmetics",
      "subcategory": "moisturizer",
      "price": 4200.00,
      "purchase_date": "2025-09-18",
      "usage_frequency": "rarely",
      "satisfaction": "regretted"
    }
  ]
}
```

**Demo Akışında:** Ayşe gece 22:30'da Apple Watch sayfasına girer (indirim sayfasından) → SepetIQ analiz eder:
- Geçmişte 2 akıllı saat almış, ikisini de **kullanmamış** (KILLER FEATURE tetiklenir)
- Gece alışverişi (-10 Need Score)
- İndirim tetikleyici (-20 Need Score)
- Profile: impulsive (×0.85 çarpan)
- **Result: Need Score ~25, Wait/Don't Buy kararı**

---

### 4.3 Can — Bütçe Duyarlı Aile Babası

```json
{
  "id": "demo_can_budget",
  "display_name": "Can D.",
  "avatar_url": "/images/demo/avatar-can.jpg",
  "age": 35,
  "occupation": "Muhasebeci",
  "persona_description": "İki çocuk babası. Bütçeyi sıkı tutar. Önce araştırır, sonra alır.",
  "default_mode": "strict",
  "monthly_budget": 3000.00,
  "behavioral_traits": ["controlled", "researcher", "budget_aware"],
  
  "past_purchases": [
    {
      "product_name": "Bosch Süpürge",
      "category": "electronics",
      "subcategory": "vacuum",
      "price": 4500.00,
      "purchase_date": "2025-04-10",
      "usage_frequency": "often",
      "satisfaction": "satisfied"
    },
    {
      "product_name": "Xiaomi Mi Band 7",
      "category": "electronics",
      "subcategory": "fitness_tracker",
      "price": 800.00,
      "purchase_date": "2024-08-15",
      "usage_frequency": "daily",
      "satisfaction": "satisfied"
    },
    {
      "product_name": "Nivea Q10 Krem",
      "category": "cosmetics",
      "subcategory": "moisturizer",
      "price": 150.00,
      "purchase_date": "2025-12-01",
      "usage_frequency": "daily",
      "satisfaction": "satisfied"
    }
  ]
}
```

**Demo Akışında:** Can La Mer kremi sayfasına girer (eşi için hediye düşünüyor) → SepetIQ:
- Geçmişi: Hep budget kategori (150 TL krem alıyor)
- Mevcut: 14.999 TL (segment 100x daha pahalı)
- Use case: Hediye amaçlı, "kesin değil" diyor
- **Result: Product Fit düşük (overkill), Consider Alternative**

---

## 5. Demo Senaryo Akışları

### Senaryo A: Mehmet + Gaming Laptop = "Buy"

```
1. Demo URL'ye git: /product/demo_laptop_gaming
2. Kullanıcı: Mehmet (önceden giriş yapılmış)
3. Eklenti açılır → "Bu ürüne gerçekten ihtiyacım var mı?"
4. Mod: Dengeli (varsayılan)
5. Sorular:
   - Bu ürünü hangi iş için almak istiyorsun?
     → "Freelance yazılım geliştirme"
   - Mevcut alternatifin var mı?
     → "Var ama 5 yaşında, artık yetersiz"
   - Bütçen zorlanıyor mu?
     → "Hayır, üniversite bursu birikti"
6. Skor üretimi:
   - Product Fit: 88 (use case mükemmel)
   - Review Risk: 75 (genel olarak iyi yorumlar)
   - Need Score: 78 (gerçek ihtiyaç, alternatif yok, bütçe ok)
7. Karar: BUY
8. Mesaj: "Bu laptopu alabilirsin. Tüm sinyaller yeşil. İş ihtiyacın için doğru seçim."
```

### Senaryo B: Ayşe + Apple Watch = "Wait" (HERO senaryo)

```
1. Demo URL'ye git: /product/demo_watch_apple
2. Saat: 22:30 (sistem saatine bağlı veya force)
3. Kullanıcı: Ayşe
4. Eklenti açılır
5. Mod: Disiplinli (Ayşe'nin varsayılan modu)
6. Sorular:
   - Bu ürünü almaya nasıl karar verdin?
     → "Sosyal medyada gördüm, indirimi de var"
   - Aynı işi gören bir ürünün var mı?
     → "Var, Samsung Galaxy Watch'um var ama kullanmıyorum"
   - Bu ürünü ne sıklıkla kullanacaksın?
     → "Bilmiyorum, deneyeceğim"
7. Cyclic Flow Tetiklenir:
   - Review Agent: %20+ pil şikayeti → ek soru
   - Ek soru: "Pil ömrü senin için kritik mi?"
     → "Hayır, çok ilgilenmem"
8. Skor üretimi:
   - Product Fit: 72 (teknik olarak uygun)
   - Review Risk: 65 (pil sorunu var)
   - Need Score: 18 (KILLER: benzer ürün hiç kullanılmamış + gece + indirim)
9. Karar: WAIT
10. Mesaj (Disiplinli):
   "Disiplinli Mod aktif. Geç saatte, indirim sayfasından geliyorsun ve benzer 
   bir saatin geçmişte kullanılmadan kaldı. Bu kararı bugün almıyoruz. 
   Yarın aynı saatte tekrar değerlendir."
11. Agent Trace gösterilir → Behavior Profile Agent'taki "similar past purchase" 
    bulgusu vurgulanır
```

### Senaryo C: Can + La Mer = "Consider Alternative"

```
1. Demo URL'ye git: /product/demo_cream_lamer
2. Kullanıcı: Can
3. Eklenti açılır
4. Mod: Dengeli
5. Sorular:
   - Bu ürünü kim için alıyorsun?
     → "Eşim için, doğum günü hediyesi"
   - Eşin bu markaya/segmente alışkın mı?
     → "Hayır, normalde Nivea kullanır"
   - Bütçen zorlanır mı?
     → "Evet, oldukça"
6. Skor üretimi:
   - Product Fit: 30 (overkill — luxury segment, normal kullanıcı için)
   - Review Risk: 70 (yorumlar genel olarak ok ama fiyat-değer sorgulanıyor)
   - Need Score: 50 (gerçek ihtiyaç var ama segment yanlış)
7. Karar: CONSIDER ALTERNATIVE
8. Mesaj:
   "Bu ürün eşin için fazla premium segment olabilir. Normalde Nivea kullanan 
   biri için bu kadar büyük bir sıçrama gerekmeyebilir. Mid-segment alternatifler 
   (örn. Estée Lauder, Clinique) hem bütçe hem deneyim açısından daha uyumlu."
```

---

## 6. Seed SQL Script

```sql
-- backend/migrations/004_seed_demo_data.sql

-- Demo products
INSERT INTO public.demo_products (id, name, category, subcategory, price, thumbnail_url, brand, demo_scenario, technical_specs, description) VALUES
('demo_laptop_gaming', 'ASUS ROG Strix G15 Gaming Laptop', 'electronics', 'laptop', 35999.00, '/images/demo/laptop-gaming.jpg', 'ASUS', 'buy', 
 '{"processor": "AMD Ryzen 9 7945HX", "ram": "32GB DDR5", "storage": "1TB NVMe SSD", "graphics": "NVIDIA RTX 4070 8GB"}'::jsonb,
 'Profesyonel oyun ve geliştirme için yüksek performanslı laptop.'),

('demo_watch_apple', 'Apple Watch Series 10 GPS 46mm', 'electronics', 'smartwatch', 18999.00, '/images/demo/watch-apple.jpg', 'Apple', 'wait',
 '{"display": "1.96\" OLED", "battery_life": "18 saat", "water_resistance": "50m"}'::jsonb,
 'Sağlık ve fitness takibi için akıllı saat.');

-- ... (diğer ürünler ve yorumlar buraya)
```

---

## 7. Image Assets

Demo için **6 ürün × 1 thumbnail = 6 görsel** gerekli.

**Kaynak önerileri:**
- Stock fotoğraf siteleri (Unsplash, Pexels)
- Üretici resmi ürün görselleri (fair use, hackathon kapsamı)
- AI üretim (Midjourney, DALL-E 3)

**Konum:** `web/public/images/demo/`

---

## 8. Trace ve Karar Geçmişi Mock'ları

Demo kullanıcılarının geçmiş kararları da hazır olmalı (Dashboard'da gösterilecek):

```json
[
  {
    "decision_id": "dec_mock_1",
    "user_id": "demo_ayse_impulsive",
    "product_name": "Charlotte Tilbury Pillow Talk Lipstick",
    "verdict": "wait",
    "scores": {"product_fit": 65, "review_risk": 78, "need_score": 32},
    "user_action": "followed",
    "estimated_savings": 2400.00,
    "created_at": "2026-04-20T22:45:00Z"
  },
  {
    "decision_id": "dec_mock_2",
    "user_id": "demo_ayse_impulsive",
    "product_name": "JBL Charge 5 Bluetooth Hoparlör",
    "verdict": "dont_buy",
    "scores": {"product_fit": 50, "review_risk": 80, "need_score": 18},
    "user_action": "followed",
    "estimated_savings": 3500.00,
    "created_at": "2026-04-15T01:20:00Z"
  }
  /* ... daha fazla mock karar */
]
```

Bu mock kararlar Stats sayfasındaki grafikleri besler.

---

## 9. Demo Veri Hazırlık Checklist'i

- [ ] 6 demo ürün eklendi (`demo_products`)
- [ ] Her ürün için 15-20 yorum (`demo_reviews`)
- [ ] 3 demo kullanıcı profili (`demo_user_profiles`)
- [ ] Her demo kullanıcı için 4-6 geçmiş alışveriş
- [ ] Her demo kullanıcı için 5-10 mock geçmiş karar
- [ ] 6 ürün thumbnail'ı + 12-18 detay fotoğrafı
- [ ] Senaryo A, B, C için karar akışları test edildi
- [ ] LLM çıktıları senaryolarla tutarlı (manuel doğrulama)
