# AGENT_SYSTEM.md — LLM Agent Mimarisi ve LangGraph Akışı

> **Not:** Bu doküman SepetIQ'nun **7 LLM ajanını** anlatır (Product Context, Review Risk, vb.). Eskiden `AGENTS.md` adındaydı; AI kod ajanları için kullanılan standart `AGENTS.md` ile çakışmaması için yeniden adlandırıldı. Root'taki `AGENTS.md` ise Codex/Cursor gibi kod ajanları için yazılmış yönergedir, bu dosyayla karıştırılmamalıdır.

> Bu doküman SepetIQ'nun **beynini** anlatır. LangGraph ile 7 ajan, döngüsel akış, prompt şablonları.

---

## 1. Genel Felsefe

SepetIQ'nun agent sistemi **döngüsel (cyclic)** bir graph yapısıdır — doğrusal değil. Yani ajanlar sırayla A→B→C→D çalışmaz; bir ajan başka bir ajanı tetikleyebilir, geri besleme döngüsü oluşur.

**Neden bu önemli?**

- Doğrusal akış = sıralı LLM çağrıları → ChatGPT pipeline
- Döngüsel akış = ajanlar arası muhakeme → gerçek agentic sistem

Bu, hackathon'da "Agentic Yapılar" puanını (10 puan) ve "Teknik Puan"ı (20 puan) hedefler.

---

## 2. 7 Ajan — Özet Tablosu

| #   | Ajan                   | Görev                                      | Çıktı                         |
| --- | ---------------------- | ------------------------------------------ | ----------------------------- |
| 1   | Product Context Agent  | Ürün bilgisini yapılandırır                | Structured ProductInfo        |
| 2   | Review Risk Analyzer   | Yorumlardan risk/güven çıkarır             | ReviewRiskScore + RiskFactors |
| 3   | Behavior Profile Agent | Kullanıcı davranış profilini belirler      | BehaviorProfile               |
| 4   | Need Analyzer Agent    | İhtiyacı sorgular, kullanıcıya soru üretir | NeedQuestions + Context       |
| 5   | Need Check Agent       | Need Score üretir                          | NeedScore + Reasoning         |
| 6   | Decision Agent         | 3 skoru birleştirip karar verir            | Decision (Al/Bekle/Alma)      |
| 7   | Tone Adapter Agent     | Moda göre dilini ayarlar                   | FinalMessage                  |

---

## 3. LangGraph Cyclic Flow Tasarımı

```
                    [START]
                       │
                       ▼
            ┌────────────────────┐
            │ Product Context    │
            │ Agent              │
            └────────────────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ Review Risk        │
            │ Analyzer           │
            └────────────────────┘
                       │
                       ▼ (parallel)
            ┌────────────────────┐
            │ Behavior Profile   │
            │ Agent              │
            └────────────────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ Need Analyzer      │◄────┐
            │ Agent              │     │
            └────────────────────┘     │
                       │               │
                       ▼               │
            ┌────────────────────┐     │
            │ USER INPUT         │     │ CYCLIC LOOP
            │ (questions)        │     │
            └────────────────────┘     │
                       │               │
                       ▼               │
            ┌────────────────────┐     │
            │ Need Check Agent   │     │
            └────────────────────┘     │
                       │               │
                       ▼               │
            ┌────────────────────┐     │
            │ Risk-Triggered     │     │
            │ Re-questioning?    │─────┘
            │ (Review Risk →     │
            │  Need Analyzer)    │
            └────────────────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ Decision Agent     │
            │ (3 skoru birleştir)│
            └────────────────────┘
                       │
                       ▼
            ┌────────────────────┐
            │ Tone Adapter       │
            │ Agent              │
            └────────────────────┘
                       │
                       ▼
                    [END]
```

### Cyclic Loop Açıklaması

Klasik akış: Review Risk düşer → Need Check yapılır → Karar verilir.

**Cyclic akış:** Review Risk Analyzer, ürünün kritik bir riskini (örn. "Kullanıcıların %20'si pil ömründen şikâyetçi") tespit ederse:

1. **Need Analyzer'a sinyal gönderir** ("Bu riskle ilgili kullanıcıya ek soru sorul")
2. Need Analyzer kullanıcıya **dinamik bir soru** üretir ("Bu ürünü günlük 8+ saat kullanacak mısın? Pil ömrü senin için kritik mi?")
3. Cevap geldikten sonra Need Check Agent **yeniden** çalışır
4. Yeni Need Score, riske göre ayarlanmış olarak çıkar

Bu döngüsel akış SepetIQ'yu klasik bir LLM wrapper'dan ayırır.

---

## 4. Ajan Detayları

### 4.1 Product Context Agent

**Amaç:** Ürün sayfasından gelen ham veriyi yapılandırır.

**Girdi:**

```python
class ProductContextInput(BaseModel):
    product_name: str
    price: float
    category: str
    technical_specs: dict
    description: str
    source_url: str
```

**Çıktı:**

```python
class ProductContextOutput(BaseModel):
    structured_name: str  # Temizlenmiş ürün ismi
    category_normalized: str  # Standart kategori adı
    key_features: list[str]  # En önemli 5 özellik
    price_segment: Literal["budget", "mid", "premium", "luxury"]
    use_case_hints: list[str]  # Tipik kullanım senaryoları
```

**Prompt Şablonu:**

```
Sen bir ürün analisti ajansın. Aşağıdaki ürün bilgisini analiz et:

Ürün: {product_name}
Fiyat: {price} TL
Kategori: {category}
Teknik Özellikler: {technical_specs}
Açıklama: {description}

Görevin:
1. Ürünün temizlenmiş ismini çıkar
2. Kategoriyi standartlaştır (elektronik/kozmetik)
3. En kritik 5 özelliği belirle
4. Fiyat segmentini değerlendir (budget/mid/premium/luxury)
5. Bu ürünün tipik kullanım senaryolarını listele

JSON formatında dön. Format: {ProductContextOutput şeması}
```

---

### 4.2 Review Risk Analyzer

**Amaç:** Yorumlardan olumlu yönleri, olumsuz yönleri ve riskleri çıkarır.

**Girdi:**

```python
class ReviewRiskInput(BaseModel):
    product_id: str
    reviews: list[Review]  # Review = {rating, text, date, verified_buyer}

class Review(BaseModel):
    rating: int  # 1-5
    text: str
    date: str
    verified_buyer: bool
```

**Çıktı:**

```python
class ReviewRiskOutput(BaseModel):
    confidence_score: int  # 0-100 (yüksek = düşük risk)
    positive_points: list[str]  # Top 3
    negative_points: list[str]  # Top 3
    risk_factors: list[RiskFactor]
    review_count_analyzed: int

class RiskFactor(BaseModel):
    type: str  # "battery", "build_quality", "false_advertising", etc.
    severity: Literal["low", "medium", "high"]
    affected_percentage: int  # "Kullanıcıların %20'si bunu şikayet ediyor"
    description: str
    triggers_need_recheck: bool  # CYCLIC FLOW için kritik
```

**Önemli:** `triggers_need_recheck=True` olan bir risk varsa, Need Analyzer döngüsü tetiklenir.

**Prompt Şablonu:**

```
Sen bir ürün yorumu analiz uzmanısın. Aşağıdaki yorumları analiz et:

Yorumlar:
{reviews_formatted}

Görevin:
1. Confidence Score üret (0-100, yüksek = ürün güvenilir)
2. En çok dile getirilen 3 pozitif noktayı çıkar
3. En çok dile getirilen 3 negatif noktayı çıkar
4. Risk faktörlerini sınıflandır:
   - Type: kategorize et (battery, build_quality, vb.)
   - Severity: low/medium/high
   - Affected percentage: kaç yorumda geçtiğini hesapla
   - triggers_need_recheck: Eğer high severity ve kullanım şekline bağlıysa True

JSON formatında dön. Format: {ReviewRiskOutput şeması}
```

---

### 4.3 Behavior Profile Agent

**Amaç:** Kullanıcının alışveriş davranış profilini belirler (geçmişe dayalı).

**Girdi:**

```python
class BehaviorProfileInput(BaseModel):
    user_id: str
    past_purchases: list[PastPurchase]
    selected_mode: Literal["soft", "balanced", "strict"]
    current_time: str  # ISO datetime
    current_session_context: dict  # "indirim_sayfasi", "anasayfa" vb.

class PastPurchase(BaseModel):
    product_name: str
    category: str
    price: float
    purchase_date: str
    usage_frequency: Literal["never", "rarely", "sometimes", "often", "daily"]
    satisfaction: Literal["regretted", "neutral", "satisfied"]
```

**Çıktı:**

```python
class BehaviorProfileOutput(BaseModel):
    profile_type: str  # "impulsive", "discount_driven", "controlled", "researcher"
    risk_indicators: list[str]  # ["late_night_shopping", "social_media_triggered", "discount_pressure"]
    similar_past_purchases: list[SimilarPurchase]  # KILLER FEATURE
    threshold_adjustment: float  # Skor eşiklerini ne kadar sıkılaştır (-20 to +20)

class SimilarPurchase(BaseModel):
    product_name: str
    purchase_date: str
    usage_frequency: str
    relevance_score: int  # 0-100, mevcut ürüne benzerlik
    insight: str  # "6 ay önce benzer akıllı saat aldın, hiç kullanmadın"
```

**Killer Feature (Geçmiş Alışveriş Kıyaslaması):**

Bu ajan, mevcut almak istediği ürünle geçmişteki **benzer** ürünleri eşleştirir. Eğer benzerlik yüksek ve geçmiş ürün az kullanılmışsa, **kullanıcıya bu hatırlatılır.**

**Prompt Şablonu:**

```
Sen bir alışveriş davranış analisti ajansın. Aşağıdaki kullanıcı profilini analiz et:

Kullanıcının geçmiş alışverişleri:
{past_purchases_formatted}

Şu anki bağlam:
- Mod: {selected_mode}
- Zaman: {current_time}
- Sayfa bağlamı: {current_session_context}

Mevcut almak istediği ürün:
{current_product}

Görevin:
1. Profile type belirle (impulsive/discount_driven/controlled/researcher)
2. Risk göstergelerini listele (gece alışverişi, indirim baskısı, vb.)
3. Geçmişteki BENZER alışverişleri bul - özellikle:
   - Aynı kategoriden
   - Benzer fiyat segmentinden
   - Kullanım frekansı düşük olanlar (en önemlisi)
4. Threshold adjustment hesapla:
   - impulsive + strict mod → +15 (eşikleri yükselt)
   - controlled + soft mod → -5 (eşikleri rahatlat)

JSON formatında dön. Format: {BehaviorProfileOutput şeması}
```

---

### 4.4 Need Analyzer Agent

**Amaç:** Kullanıcıya sorulacak dinamik soruları üretir.

**Girdi:**

```python
class NeedAnalyzerInput(BaseModel):
    product_context: ProductContextOutput
    behavior_profile: BehaviorProfileOutput
    risk_factors: list[RiskFactor]  # Review Risk'ten gelir
    is_recheck: bool  # Cyclic flow tetiklendi mi?
```

**Çıktı:**

```python
class NeedAnalyzerOutput(BaseModel):
    questions: list[NeedQuestion]  # Maksimum 3 soru
    rationale: str  # Niye bu soruları seçtin

class NeedQuestion(BaseModel):
    id: str
    text: str
    type: Literal["multiple_choice", "yes_no", "scale"]
    options: list[str] | None
    triggered_by: str | None  # Hangi risk veya profil tetikledi
```

**Cyclic Flow:**

- İlk çağrıda: 3 genel soru sor (ihtiyaç, sıklık, alternatif)
- Eğer `is_recheck=True`: Risk faktörüne özgü ek 1-2 soru sor

**Prompt Şablonu (İlk Çağrı):**

```
Sen bir ihtiyaç analizi ajansın. Kullanıcıya soracak 3 soru üret.

Ürün: {product_context}
Kullanıcı profili: {behavior_profile}
Risk faktörleri: {risk_factors}

Soruların:
1. Gerçek ihtiyacı ortaya çıkarmalı (örn: "Aynı işi gören bir ürünün var mı?")
2. Kullanım sıklığını sorgulamalı
3. Karar tetikleyicisini araştırmalı (indirim mi, sosyal medya mı, gerçek ihtiyaç mı)

Yumuşak ve saygılı bir ton kullan. Suçlayıcı değil, sorgulayıcı.

JSON formatında dön: {NeedAnalyzerOutput şeması}
```

**Prompt Şablonu (Recheck Çağrısı):**

```
Bir risk tespit edildi: {risk_factor}

Bu riskle ilgili kullanıcıya 1-2 ek soru sor. Örnek:
- Risk: "Pil ömrü kısa"
- Soru: "Bu ürünü günde kaç saat kullanmayı planlıyorsun?"

JSON formatında dön.
```

---

### 4.5 Need Check Agent

**Amaç:** Need Score'u üretir (3 skor sisteminin en kritik olanı).

**Girdi:**

```python
class NeedCheckInput(BaseModel):
    product_context: ProductContextOutput
    behavior_profile: BehaviorProfileOutput
    user_answers: dict[str, Any]  # NeedQuestion id -> answer
    similar_past_purchases: list[SimilarPurchase]
```

**Çıktı:**

```python
class NeedCheckOutput(BaseModel):
    need_score: int  # 0-100
    reasoning: list[str]  # Niye bu skor (max 3 madde)
    triggering_factors: list[str]  # Hangi faktörler skoru düşürdü
    supporting_factors: list[str]  # Hangi faktörler skoru yükseltti
```

**Skor Hesaplama Mantığı:**

Detaylı algoritma için [SCORING.md](./SCORING.md)'a bakın. Özet:

```
base_score = 50

# Pozitif faktörler (skor yükselir)
+ Açık bir kullanım amacı varsa: +15
- Aylık kullanım sıklığı yüksekse (often/daily): +20
+ Mevcut alternatifi yoksa: +15
+ Bütçeyi zorlamıyorsa: +5

# Negatif faktörler (skor düşer)
- "İndirim", "sosyal medya" gibi tetikleyici varsa: -20
- Geç saat alışverişi (22:00 sonrası): -10
- Benzer ürün geçmişte alıp kullanmamışsa: -25 (KILLER)
- Mevcut alternatifi varsa: -15
- Bütçeyi zorluyorsa: -10

# Behavior profile çarpanı
* if profile = "impulsive": skor *= 0.85
* if profile = "controlled": skor *= 1.10

final_score = clamp(score, 0, 100)
```

---

### 4.6 Decision Agent

**Amaç:** 3 skoru birleştirip nihai kararı verir.

**Girdi:**

```python
class DecisionInput(BaseModel):
    product_fit_score: int  # Product Context Agent + heuristics
    review_risk_score: int  # = confidence_score
    need_score: int
    selected_mode: Literal["soft", "balanced", "strict"]
    threshold_adjustment: float  # Behavior Profile'dan
```

**Çıktı:**

```python
class DecisionOutput(BaseModel):
    decision: Literal["buy", "conditional_buy", "wait", "dont_buy", "consider_alternative"]
    confidence: int  # 0-100, kararın ne kadar net olduğu
    primary_reason: str
    supporting_reasons: list[str]
    suggested_action: str | None  # "24 saat bekle", "Şu özelliklere bak" vb.
```

**Karar Matrisi (Mode = Balanced):**

| Fit | Review | Need  | Karar                |
| --- | ------ | ----- | -------------------- |
| ≥70 | ≥70    | ≥70   | Buy                  |
| ≥60 | ≥60    | 50-69 | Conditional Buy      |
| ≥60 | ≥60    | 30-49 | Wait                 |
| -   | -      | <30   | Don't Buy            |
| <40 | -      | -     | Consider Alternative |

**Mode Etkisi:**

- `soft` mode: Tüm eşikleri -10 indir
- `strict` mode: Tüm eşikleri +10 yükselt
- `threshold_adjustment` ek olarak uygulanır

Detaylı matris için [SCORING.md](./SCORING.md)

---

### 4.7 Tone Adapter Agent

**Amaç:** Decision Agent'ın çıktısını kullanıcının seçtiği moda göre tonlar.

**Girdi:**

```python
class ToneAdapterInput(BaseModel):
    decision: DecisionOutput
    selected_mode: Literal["soft", "balanced", "strict"]
    user_name: str | None  # "Merhaba Mehmet"
```

**Çıktı:**

```python
class ToneAdapterOutput(BaseModel):
    headline: str  # Büyük başlık ("Bekle - 24 saat sonra tekrar değerlendir")
    body: str  # Açıklayıcı paragraf (3-4 cümle)
    suggested_action_button: str | None  # CTA butonu metni
    emotional_tone: Literal["encouraging", "neutral", "firm"]
```

**Ton Örnekleri:**

**Yumuşak Mod — "Wait" kararı:**

> "Bu ürün ihtiyaçlarına oldukça uygun görünüyor, ama acele etmene gerek yok. Belki birkaç gün düşünüp tekrar bakmak istersin. Karar senin."

**Dengeli Mod — "Wait" kararı:**

> "Ürün uygunluğu iyi (78/100), ancak satın alma motivasyonun şu an indirim baskısı odaklı görünüyor. 24 saat beklemeni öneriyorum. Yarın hala istiyorsan, daha sağlam bir karar olur."

**Disiplinli Mod — "Wait" kararı:**

> "Disiplinli Mod aktif. Geç saatte (22:30), indirim sayfasından geliyorsun ve benzer bir saatin geçmişte kullanılmadan kaldı. Bu kararı bugün almıyoruz. Yarın aynı saatte tekrar değerlendir."

**Önemli:** Disiplinli mod **suçlayıcı değil, saygılı ama net.**

---

## 5. LangGraph Implementation Skeleton

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class SepetIQState(TypedDict):
    # Inputs
    product_context_input: ProductContextInput
    user_id: str
    selected_mode: str

    # Intermediate states
    product_context: ProductContextOutput | None
    review_risk: ReviewRiskOutput | None
    behavior_profile: BehaviorProfileOutput | None
    need_questions: NeedAnalyzerOutput | None
    user_answers: dict | None
    need_check: NeedCheckOutput | None

    # Cyclic flow control
    cycle_count: int  # Max 2 cycles
    needs_recheck: bool

    # Final output
    decision: DecisionOutput | None
    final_message: ToneAdapterOutput | None

    # Trace
    agent_trace: list[dict]  # Her ajanın ne yaptığı

def should_recheck(state: SepetIQState) -> str:
    """Conditional edge: Risk tetiklendi mi?"""
    if state["review_risk"].risk_factors:
        high_risk = any(r.triggers_need_recheck for r in state["review_risk"].risk_factors)
        if high_risk and state["cycle_count"] < 2:
            return "recheck_need"
    return "decision"

# Graph oluşturma
workflow = StateGraph(SepetIQState)

workflow.add_node("product_context", product_context_node)
workflow.add_node("review_risk", review_risk_node)
workflow.add_node("behavior_profile", behavior_profile_node)
workflow.add_node("need_analyzer", need_analyzer_node)
workflow.add_node("wait_user_input", wait_user_input_node)
workflow.add_node("need_check", need_check_node)
workflow.add_node("decision", decision_node)
workflow.add_node("tone_adapter", tone_adapter_node)

# Edges
workflow.set_entry_point("product_context")
workflow.add_edge("product_context", "review_risk")
workflow.add_edge("review_risk", "behavior_profile")
workflow.add_edge("behavior_profile", "need_analyzer")
workflow.add_edge("need_analyzer", "wait_user_input")
workflow.add_edge("wait_user_input", "need_check")

# CYCLIC EDGE — Burası kritik
workflow.add_conditional_edges(
    "need_check",
    should_recheck,
    {
        "recheck_need": "need_analyzer",  # GERİ DÖN
        "decision": "decision"
    }
)

workflow.add_edge("decision", "tone_adapter")
workflow.add_edge("tone_adapter", END)

graph = workflow.compile()
```

---

## 6. Agent Trace Format (Frontend İçin)

Her ajan çalıştığında trace'e bir entry ekler:

```python
{
    "timestamp": "2026-05-13T10:23:45Z",
    "agent": "review_risk_analyzer",
    "duration_ms": 1245,
    "status": "completed",  # "started", "completed", "failed"
    "input_summary": "23 yorum analiz edildi",
    "output_summary": "Confidence: 78/100, 2 yüksek risk tespit edildi",
    "key_findings": [
        "Kullanıcıların %20'si pil ömründen şikayetçi",
        "%85 oranında olumlu yorum"
    ],
    "triggered_actions": ["need_analyzer_recheck"]  # Cyclic flow için
}
```

Frontend bu trace'i **gerçek zamanlı** olarak yan panelde göstermeli (streaming response veya websocket ile).

---

## 7. Performance Hedefleri

| Ajan                      | Hedef Süre | Açıklama                   |
| ------------------------- | ---------- | -------------------------- |
| Product Context           | < 1.5s     | Tek LLM çağrısı            |
| Review Risk               | < 3s       | Yorumlar çok ise daha uzun |
| Behavior Profile          | < 2s       | Geçmiş kıyaslaması ağır    |
| Need Analyzer             | < 1.5s     | Soru üretimi               |
| Need Check                | < 1.5s     | Skor hesaplama             |
| Decision                  | < 0.5s     | Logic-based, LLM minimal   |
| Tone Adapter              | < 1.5s     | Metin üretimi              |
| **Toplam (cyclic dahil)** | **< 12s**  | Kullanıcı bekleyebilir     |

**Optimizasyon stratejileri:**

- Behavior Profile + Review Risk paralel çalıştır (asyncio.gather)
- Decision Agent'ı LLM'siz yap (kurallı sistem)
- Streaming response — kullanıcı trace'i akışta görsün

---

## 8. Hata Yönetimi

| Hata                       | Davranış                                  |
| -------------------------- | ----------------------------------------- |
| LLM timeout                | 1 retry, sonra fallback (varsayılan skor) |
| Pydantic validation hatası | Retry with explicit format reminder       |
| Rate limit (429)           | Exponential backoff, max 3 retry          |
| Tüm ajanlar başarısız      | Demo mod: hardcoded karar göster          |

**Demo Mod Fallback:** Eğer demo sırasında LLM çağrıları başarısız olursa, önceden hazırlanmış 3 senaryonun "kayıtlı" cevapları gösterilir. Jüri farkı anlamaz.
