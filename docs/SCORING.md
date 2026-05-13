# SCORING.md — Skor Sistemi ve Karar Matrisi

> Bu doküman SepetIQ'nun **karar mantığını** anlatır. 3 skor nasıl hesaplanır, karar nasıl üretilir.

---

## 1. Üç Skor Sistemi

SepetIQ tek bir skor üretmez. **Üç bağımsız skor** üretir, sonra bunları birleştirir.

### 1.1 Product Fit Score (Ürün Uygunluk Skoru)
- **Aralık:** 0-100
- **Yüksek = İyi:** 100 = ürün tam senin için
- **Sahibi:** Product Context Agent + heuristic kurallar
- **Ne ölçer:** Ürün teknik olarak ihtiyacına uygun mu?

### 1.2 Review Risk Score (Yorum Risk Skoru)
- **Aralık:** 0-100
- **Yüksek = İyi:** 100 = yorumlar tamamen güven veriyor
- **Sahibi:** Review Risk Analyzer Agent
- **Ne ölçer:** Yorumlar bu ürüne güven verir mi?
- **NOT:** İsim "Risk" ama yorumlanışı "Confidence" — kafa karışıklığını önlemek için frontend'de "Yorum Güveni" olarak göster.

### 1.3 Need Score (İhtiyaç Skoru)
- **Aralık:** 0-100
- **Yüksek = İyi:** 100 = gerçekten ihtiyacın var
- **Sahibi:** Need Check Agent
- **Ne ölçer:** Bu ürüne gerçek ihtiyacın var mı, yoksa dürtü mü?
- **En kritik skor.** SepetIQ'nun ana farkı bu skoru üretmesi.

---

## 2. Product Fit Score Hesaplama

LLM + heuristic hibrit yaklaşım.

### 2.1 LLM Tarafı

Product Context Agent ürünün özelliklerini değerlendirir:
- Kullanım amacına uygunluk
- Teknik yeterlilik
- Fiyat/performans dengesi

LLM çıktısı: `base_fit_score (0-100)`

### 2.2 Heuristic Düzeltmeler

```python
def calculate_product_fit(
    base_fit_score: int,
    user_use_case: str,
    product: ProductContextOutput,
    user_answers: dict
) -> int:
    score = base_fit_score
    
    # Use case match
    if user_use_case in product.use_case_hints:
        score += 10
    
    # Bütçe kontrolü (kullanıcı cevaplarından)
    if user_answers.get("budget_strain") == "high":
        score -= 5
    
    # Aşırı özellik (overkill)
    if product.price_segment == "luxury" and user_use_case == "casual":
        score -= 15  # "Sadece web gezinmek için 35K TL laptop fazla"
    
    # Yetersiz özellik (underkill)
    if product.price_segment == "budget" and user_use_case == "professional":
        score -= 20  # "Profesyonel iş için budget cihaz yetersiz"
    
    return max(0, min(100, score))
```

---

## 3. Review Risk Score Hesaplama

### 3.1 Temel Skor

LLM yorumları analiz eder, base confidence verir.

### 3.2 Risk Faktörü Düşüşleri

```python
def calculate_review_risk(
    base_confidence: int,
    risk_factors: list[RiskFactor]
) -> int:
    score = base_confidence
    
    for risk in risk_factors:
        # Severity'e göre düşüş
        if risk.severity == "high":
            penalty = risk.affected_percentage * 0.5  # %20 etkilenen high risk → -10
        elif risk.severity == "medium":
            penalty = risk.affected_percentage * 0.3
        else:
            penalty = risk.affected_percentage * 0.1
        
        score -= penalty
    
    return max(0, min(100, int(score)))
```

### 3.3 Veri Yetersizliği Cezası

Yorum sayısı yetersizse skor düşürülür:

```python
if review_count < 10:
    score = score * 0.7  # %30 düşüş
elif review_count < 30:
    score = score * 0.85
# 30+ yorum: değişiklik yok
```

---

## 4. Need Score Hesaplama (En Kritik)

Need Score 4 katmandan oluşur:

### 4.1 Base Score
Herkes 50'den başlar (nötr).

### 4.2 Pozitif Faktörler (Need'i yükselten)

| Faktör | Etki | Tetikleyici |
|---|---|---|
| Açık kullanım amacı | +15 | Kullanıcı "şu iş için lazım" diyebildi |
| Yüksek kullanım sıklığı | +20 | "Her gün" veya "haftada birkaç kez" |
| Alternatif yokluğu | +15 | "Aynı işi gören ürünüm yok" |
| Bütçe rahat | +5 | Bütçeyi zorlamıyor |
| Profesyonel ihtiyaç | +10 | İş için, hobi için değil |

### 4.3 Negatif Faktörler (Need'i düşüren)

| Faktör | Etki | Tetikleyici |
|---|---|---|
| Tetikleyici alışveriş | -20 | "İndirim", "sosyal medya", "anlık" |
| Geç saat alışverişi | -10 | 22:00 - 03:00 arası |
| **Benzer geçmiş, kullanılmamış** | **-25** | KILLER FEATURE |
| Mevcut alternatif var | -15 | "Benzer ürünüm var ve çalışıyor" |
| Bütçe zorlanır | -10 | Aylık gelir > %30 |
| Hediye amaçlı, kişi karasız | -10 | "Hediye için ama emin değilim" |

### 4.4 Behavior Profile Çarpanı

```python
if profile_type == "impulsive":
    score *= 0.85  # Skoru %15 düşür
elif profile_type == "discount_driven":
    score *= 0.90
elif profile_type == "controlled":
    score *= 1.10  # Skoru %10 yükselt
elif profile_type == "researcher":
    score *= 1.05
```

### 4.5 Tam Algoritma

```python
def calculate_need_score(
    user_answers: dict,
    behavior_profile: BehaviorProfileOutput,
    current_time: datetime,
    similar_purchases: list[SimilarPurchase]
) -> int:
    score = 50  # Base
    
    # Pozitifler
    if user_answers.get("has_clear_purpose"):
        score += 15
    
    frequency = user_answers.get("usage_frequency")
    if frequency in ["daily", "often"]:
        score += 20
    elif frequency == "sometimes":
        score += 10
    
    if user_answers.get("has_alternative") == False:
        score += 15
    
    if user_answers.get("budget_strain") == "low":
        score += 5
    
    if user_answers.get("purpose_type") == "professional":
        score += 10
    
    # Negatifler
    trigger = user_answers.get("main_trigger")
    if trigger in ["discount", "social_media", "impulse"]:
        score -= 20
    
    if 22 <= current_time.hour or current_time.hour <= 3:
        score -= 10
    
    # KILLER FEATURE: Benzer geçmiş kullanılmamış
    for purchase in similar_purchases:
        if purchase.relevance_score > 70 and purchase.usage_frequency in ["never", "rarely"]:
            score -= 25
            break  # Maksimum 1 kez uygula
    
    if user_answers.get("has_alternative") == True:
        score -= 15
    
    if user_answers.get("budget_strain") == "high":
        score -= 10
    
    # Behavior çarpanı
    multipliers = {
        "impulsive": 0.85,
        "discount_driven": 0.90,
        "balanced": 1.0,
        "controlled": 1.10,
        "researcher": 1.05
    }
    score *= multipliers.get(behavior_profile.profile_type, 1.0)
    
    return max(0, min(100, int(score)))
```

---

## 5. Karar Matrisi

3 skorla nihai karar üretilir.

### 5.1 Temel Matris (Mode = Balanced)

| Product Fit | Review Risk | Need Score | Karar |
|---|---|---|---|
| ≥70 | ≥70 | ≥70 | **Buy** (Al) |
| ≥60 | ≥60 | 50-69 | **Conditional Buy** (Şartlı Al) |
| ≥60 | ≥60 | 30-49 | **Wait** (Bekle) |
| - | - | <30 | **Don't Buy** (Alma) |
| <40 | - | - | **Consider Alternative** (Alternatif Düşün) |
| - | <40 | - | **Wait** (Yorumlar yetersiz) |

### 5.2 Mod Etkisi

Eşikler moda göre değişir:

```python
mode_threshold_offsets = {
    "soft": -10,      # Eşikleri rahatlat
    "balanced": 0,    # Standart
    "strict": +10     # Eşikleri sıkılaştır
}

# Behavior profile ek ayar (-20 to +20)
final_offset = mode_offset + behavior_profile.threshold_adjustment
```

**Örnek:**
- Strict mod + impulsive profil (+10 + 15 = +25 offset)
- "Buy" eşiği 70 yerine 95 olur
- Yani çok yüksek skorlar bile "Conditional Buy" döner

### 5.3 Karar Algoritması

```python
def make_decision(
    product_fit: int,
    review_risk: int,
    need_score: int,
    mode: str,
    threshold_adjustment: float
) -> DecisionOutput:
    offset = mode_threshold_offsets[mode] + threshold_adjustment
    
    # Eşikler
    high = 70 + offset
    mid = 50 + offset
    low = 30 + offset
    
    # Decision logic
    if product_fit < 40 + offset:
        return DecisionOutput(
            decision="consider_alternative",
            primary_reason="Ürün ihtiyacına teknik olarak uygun değil",
            ...
        )
    
    if review_risk < 40:  # Yorumlar yetersiz - mod-bağımsız
        return DecisionOutput(
            decision="wait",
            primary_reason="Yorum güvenilirliği düşük, daha fazla veri bekle",
            ...
        )
    
    if need_score < low:
        return DecisionOutput(
            decision="dont_buy",
            primary_reason="Şu an gerçek bir ihtiyaç tespit edilmedi",
            ...
        )
    
    if product_fit >= high and review_risk >= high and need_score >= high:
        return DecisionOutput(
            decision="buy",
            confidence=95,
            primary_reason="Tüm skorlar yüksek — ürün senin için doğru",
            ...
        )
    
    if product_fit >= mid and review_risk >= mid and need_score >= mid:
        if need_score >= high:
            return DecisionOutput(decision="buy", confidence=75, ...)
        return DecisionOutput(decision="conditional_buy", confidence=70, ...)
    
    # Geri kalan durumlar: wait
    return DecisionOutput(
        decision="wait",
        primary_reason="Skorlar net karar için yeterli değil",
        suggested_action="24 saat sonra tekrar değerlendir",
        ...
    )
```

---

## 6. Decision Output Formatları

### 6.1 Buy (Al)
```
Headline: "Bu ürünü alabilirsin"
Confidence: 80-100
Suggested action: None (kullanıcı zaten almak istiyordu)
```

### 6.2 Conditional Buy (Şartlı Al)
```
Headline: "Almadan önce şunları kontrol et"
Confidence: 60-80
Suggested action: "Şu özelliklere dikkat et: [risk faktörleri]"
```

### 6.3 Wait (Bekle)
```
Headline: "Bu kararı şimdi verme"
Confidence: 50-75
Suggested action: "24 saat bekle. Yarın hala istiyorsan tekrar gel."
```

### 6.4 Don't Buy (Alma)
```
Headline: "Bu ürünü şu an almamanı öneriyorum"
Confidence: 70-95
Suggested action: "İhtiyacını yeniden değerlendir, belki gerçekten gerekmiyor"
```

### 6.5 Consider Alternative (Alternatif Düşün)
```
Headline: "Bu ürün senin için değil — alternatiflere bak"
Confidence: 80-95
Suggested action: "Şu kriterlerde alternatifler ara: [öneriler]"
```

---

## 7. Edge Case'ler (Sınır Durumlar)

### 7.1 Eşit veya Çelişen Skorlar
Eğer 2 karar arasında %5'lik fark varsa, **daha conservative (muhafazakar)** olanı seç:
- Buy vs Conditional Buy → Conditional Buy
- Conditional Buy vs Wait → Wait

### 7.2 Bilgi Yetersizliği
Eğer Behavior Profile boşsa (yeni kullanıcı, geçmiş yok):
- Strict mod kullanılamaz (varsayılan = balanced)
- Need Score base 50'den başlamaz, 45'ten başlar (daha temkinli)

### 7.3 Cyclic Flow Tetiklendi
Eğer Review Risk → Need recheck döngüsü çalıştıysa:
- Need Score yeniden hesaplanır
- Karar yeniden verilir
- Trace'e "cycle 2" notu eklenir

---

## 8. Skor Görselleştirmesi (Frontend)

### 8.1 Renk Kodu

| Skor | Renk |
|---|---|
| 80-100 | Yeşil |
| 60-79 | Sarı-Yeşil |
| 40-59 | Sarı |
| 20-39 | Turuncu |
| 0-19 | Kırmızı |

### 8.2 Sunum Format

```
┌─────────────────────────────────────┐
│  Product Fit Score:    86 / 100  ✓  │
│  Review Confidence:    78 / 100  ✓  │
│  Need Score:           42 / 100  ⚠  │
├─────────────────────────────────────┤
│  KARAR: BEKLE                       │
│  24 saat sonra tekrar değerlendir   │
└─────────────────────────────────────┘
```

---

## 9. Test Senaryoları

### Senaryo 1: Açık Buy
- Mehmet, yazılım öğrencisi, oyuncu laptop
- Use case: freelance + oyun
- Eski laptop bozuk, alternatif yok
- Mod: Dengeli
- **Beklenen:** Fit=85, Risk=80, Need=78 → **Buy**

### Senaryo 2: Açık Wait
- Ayşe, akıllı saat, 22:30
- "İndirim son gün" tetikleyicisi
- Geçmişte 6 ay önce benzer saat almış, kullanmamış
- Mod: Disiplinli
- **Beklenen:** Fit=75, Risk=70, Need=25 → **Wait** (veya Don't Buy)

### Senaryo 3: Consider Alternative
- Can, premium kamera, sadece tatil fotoğrafı
- Profesyonel ihtiyaç yok
- Bütçe zorluyor
- Mod: Dengeli
- **Beklenen:** Fit=35, Risk=80, Need=40 → **Consider Alternative**
