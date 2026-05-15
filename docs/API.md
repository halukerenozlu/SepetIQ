# API.md — Backend API Spesifikasyonu

> Bu doküman FastAPI backend'in tüm endpoint'lerini ve veri sözleşmelerini (data contracts) tanımlar.

---

## 1. Base Configuration

**Base URL (Production):** `https://sepetiq-api.up.railway.app`
**Base URL (Development):** `http://localhost:8000`

**API Versioning:** Tüm endpoint'ler `/api/v1` prefix'i kullanır.

**Authentication:** Supabase JWT (JSON Web Token) tokenları. `Authorization: Bearer <token>` header'ında gönderilir.

**Content-Type:** `application/json`

---

## 2. Endpoint Özet Tablosu

| Method | Path | Açıklama | Auth Gerekli |
|---|---|---|---|
| POST | `/api/v1/decisions/analyze` | Tam karar akışını başlat | ✓ |
| POST | `/api/v1/decisions/{decision_id}/answer` | Need sorularına cevap ver | ✓ |
| GET | `/api/v1/decisions/{decision_id}` | Karar detayı | ✓ |
| GET | `/api/v1/decisions/{decision_id}/trace` | Agent trace | ✓ |
| GET | `/api/v1/users/me` | Kullanıcı profili | ✓ |
| PATCH | `/api/v1/users/me` | Profil güncelle | ✓ |
| GET | `/api/v1/users/me/history` | Geçmiş kararlar | ✓ |
| GET | `/api/v1/users/me/purchases` | Geçmiş alışverişler | ✓ |
| POST | `/api/v1/users/me/purchases` | Manuel alışveriş ekle | ✓ |
| GET | `/api/v1/users/me/stats` | Tasarruf istatistikleri | ✓ |
| GET | `/api/v1/demo/products` | Demo ürün listesi (eklenti için) | ✗ |
| GET | `/api/v1/demo/products/{id}` | Demo ürün detayı | ✗ |
| GET | `/api/v1/health` | Health check | ✗ |

---

## 3. Karar Akışı Endpoint'leri

### 3.1 POST `/api/v1/decisions/analyze`

Yeni bir karar analizi başlatır. Bu endpoint **streaming response** döner (Server-Sent Events ile agent trace akar).

**Request Body:**
```typescript
{
  "product": {
    "name": "Apple Watch Series 10",
    "price": 18999.00,
    "category": "electronics",
    "subcategory": "smartwatch",
    "technical_specs": {
      "battery_life": "18 hours",
      "water_resistance": "50m",
      "display": "OLED 1.9 inch"
    },
    "description": "Full product description...",
    "source_url": "https://www.trendyol.com/...",
    "reviews": [
      {
        "rating": 5,
        "text": "Mükemmel saat...",
        "date": "2026-05-01",
        "verified_buyer": true
      }
    ]
  },
  "mode": "balanced",  // "soft" | "balanced" | "strict"
  "context": {
    "page_type": "product_page",  // "product_page" | "checkout" | "discount_section"
    "from_discount": true,
    "session_duration_seconds": 1500,
    "source": "social_media"  // "direct" | "search" | "social_media" | "email"
  }
}
```

**Response:** Server-Sent Events (SSE) stream

```
event: agent_started
data: {"agent": "product_context", "timestamp": "2026-05-13T..."}

event: agent_completed
data: {
  "agent": "product_context",
  "duration_ms": 1245,
  "summary": "Ürün premium segment akıllı saat, su geçirmez",
  "output": { /* ProductContextOutput */ }
}

event: agent_started
data: {"agent": "review_risk", ...}

...

event: questions_required
data: {
  "decision_id": "dec_abc123",
  "questions": [
    {
      "id": "q1",
      "text": "Bu saati günde kaç saat kullanacaksın?",
      "type": "multiple_choice",
      "options": ["1-3 saat", "4-8 saat", "8+ saat"]
    }
  ]
}

[Akış burada durur - kullanıcı /api/v1/decisions/{decision_id}/answer endpoint'ine cevap göndermeli]
```

**Cyclic Flow Devamı:**
Kullanıcı cevapları gönderdikten sonra akış devam eder:

```
event: cycle_iteration
data: {"cycle": 2, "reason": "high_severity_risk_detected"}

event: agent_started
data: {"agent": "need_analyzer", ...}  // İkinci kez çalışıyor

...

event: decision_ready
data: {
  "decision": {
    "decision_id": "dec_abc123",
    "verdict": "wait",
    "scores": {
      "product_fit": 78,
      "review_risk": 65,
      "need_score": 32
    },
    "primary_reason": "Geçmişte benzer ürün kullanılmamış",
    "headline": "Bu kararı şimdi verme",
    "body": "Disiplinli mod aktif. 6 ay önce benzer akıllı saat aldın...",
    "suggested_action": "24 saat sonra tekrar değerlendir"
  }
}

event: stream_end
data: {"total_duration_ms": 9450, "cycles": 2}
```

---

### 3.2 POST `/api/v1/decisions/{decision_id}/answer`

Need Analyzer'ın sorduğu sorulara cevap gönderir.

**Request Body:**
```typescript
{
  "answers": {
    "q1": "1-3 saat",
    "q2": "social_media",
    "q3": "no"
  }
}
```

**Response:** Aynı SSE stream'i devam eder. Yeni event'ler akmaya başlar.

---

### 3.3 GET `/api/v1/decisions/{decision_id}`

Tamamlanmış bir karar detayını döner.

**Response:**
```typescript
{
  "decision_id": "dec_abc123",
  "user_id": "user_xyz",
  "created_at": "2026-05-13T22:30:15Z",
  "product": { /* ProductInfo */ },
  "scores": {
    "product_fit": 78,
    "review_risk": 65,
    "need_score": 32
  },
  "verdict": "wait",
  "mode_used": "strict",
  "user_action": null,  // "followed" | "ignored" | null (henüz belli değil)
  "estimated_savings": 18999.00,  // Eğer karar takip edildiyse
  "questions_asked": [ /* questions */ ],
  "user_answers": { /* answers */ },
  "tone_output": { /* ToneAdapterOutput */ }
}
```

---

### 3.4 GET `/api/v1/decisions/{decision_id}/trace`

Agent trace'i döner. Frontend agent trace panelinde gösterir.

**Response:**
```typescript
{
  "decision_id": "dec_abc123",
  "total_duration_ms": 9450,
  "cycles": 2,
  "agents": [
    {
      "agent": "product_context",
      "started_at": "...",
      "completed_at": "...",
      "duration_ms": 1245,
      "status": "completed",
      "input_summary": "Apple Watch Series 10, 18.999 TL",
      "output_summary": "Premium segment, fitness/notification kullanım",
      "key_findings": ["Premium fiyat segmenti", "Su geçirmez", "..."]
    },
    {
      "agent": "review_risk",
      ...
      "key_findings": [
        "23 yorum analiz edildi",
        "Kullanıcıların %20'si pil ömründen şikayetçi",
        "triggers_need_recheck = True"
      ]
    },
    {
      "agent": "need_analyzer",
      "iteration": 1,
      ...
    },
    {
      "agent": "need_check",
      "iteration": 1,
      ...
    },
    {
      "agent": "need_analyzer",
      "iteration": 2,  // CYCLIC FLOW
      "trigger": "high_severity_risk_detected",
      ...
    },
    ...
  ]
}
```

---

## 4. Kullanıcı Endpoint'leri

### 4.1 GET `/api/v1/users/me`

Mevcut kullanıcının profilini döner.

**Response:**
```typescript
{
  "user_id": "user_xyz",
  "email": "mehmet@example.com",
  "name": "Mehmet",
  "avatar_url": "https://...",
  "preferences": {
    "default_mode": "balanced",
    "monthly_budget": 5000.00,
    "savings_goal": 2000.00,
    "notifications_enabled": true
  },
  "stats_summary": {
    "total_decisions": 47,
    "decisions_followed_rate": 0.83,
    "estimated_savings_lifetime": 12450.00,
    "member_since": "2026-03-15"
  }
}
```

### 4.2 PATCH `/api/v1/users/me`

Kullanıcı tercihlerini günceller.

**Request:**
```typescript
{
  "preferences": {
    "default_mode": "strict",
    "monthly_budget": 6000.00
  }
}
```

---

### 4.3 GET `/api/v1/users/me/history`

Geçmiş kararlar listesi.

**Query Params:**
- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `verdict` (filtre: "wait" | "buy" | ...)
- `from_date`, `to_date` (ISO date)

**Response:**
```typescript
{
  "total": 47,
  "items": [
    {
      "decision_id": "dec_abc123",
      "created_at": "...",
      "product_name": "Apple Watch Series 10",
      "verdict": "wait",
      "scores": { ... },
      "user_action": "followed",  // Disiplinli moda uydu
      "estimated_savings": 18999.00
    }
  ]
}
```

---

### 4.4 GET `/api/v1/users/me/purchases`

Kullanıcının geçmiş alışverişleri (manuel girilmiş veya kararlardan otomatik).

**Response:**
```typescript
{
  "items": [
    {
      "purchase_id": "p_123",
      "product_name": "Samsung Galaxy Watch 5",
      "category": "electronics",
      "subcategory": "smartwatch",
      "price": 8500.00,
      "purchase_date": "2025-11-20",
      "usage_frequency": "rarely",  // user-reported
      "satisfaction": "regretted"
    }
  ]
}
```

### 4.5 POST `/api/v1/users/me/purchases`

Manuel alışveriş ekleme.

**Request:**
```typescript
{
  "product_name": "Samsung Galaxy Watch 5",
  "category": "electronics",
  "price": 8500.00,
  "purchase_date": "2025-11-20",
  "usage_frequency": "rarely",
  "satisfaction": "regretted"
}
```

---

### 4.6 GET `/api/v1/users/me/stats`

Tasarruf istatistikleri (Companion Web Dashboard için).

**Response:**
```typescript
{
  "lifetime": {
    "total_decisions": 47,
    "decisions_by_verdict": {
      "buy": 18,
      "wait": 15,
      "dont_buy": 10,
      "consider_alternative": 4
    },
    "estimated_savings": 12450.00,
    "money_spent_after_approval": 8900.00
  },
  "monthly": {
    "current_month_decisions": 8,
    "current_month_savings": 2150.00,
    "vs_previous_month": "+15%"
  },
  "behavioral_insights": [
    "En çok gece (22-02) alışveriş yapmaya çalışıyorsun",
    "İndirim baskısı en güçlü tetikleyicin",
    "Disiplinli mod kararlarına %91 oranında uyuyorsun"
  ]
}
```

---

## 5. Demo Endpoint'leri (Eklenti İçin Mock Data)

Hackathon demo'sunda gerçek e-ticaret API'leri yerine demo ürünleri kullanılır.

### 5.1 GET `/api/v1/demo/products`

```typescript
{
  "items": [
    {
      "id": "demo_laptop_1",
      "name": "ASUS ROG Strix G15 Gaming Laptop",
      "price": 35999.00,
      "category": "electronics",
      "thumbnail_url": "...",
      "review_count": 142
    },
    ...
  ]
}
```

### 5.2 GET `/api/v1/demo/products/{id}`

Tam ürün detayı + yorumlar.

```typescript
{
  "id": "demo_laptop_1",
  "name": "...",
  "price": 35999.00,
  "category": "electronics",
  "technical_specs": { ... },
  "description": "...",
  "reviews": [
    {
      "id": "rev_1",
      "rating": 5,
      "text": "...",
      "date": "...",
      "verified_buyer": true
    }
  ]
}
```

---

## 6. Health & Monitoring

### 6.1 GET `/api/v1/health`

```typescript
{
  "status": "healthy",
  "version": "0.1.0",
  "dependencies": {
    "database": "ok",
    "gemini_api": "ok",
    "langgraph": "ok"
  },
  "uptime_seconds": 12345
}
```

---

## 7. Error Format

Tüm hatalar standart format kullanır:

```typescript
{
  "error": {
    "code": "DECISION_NOT_FOUND",
    "message": "Decision with ID 'dec_abc123' not found",
    "details": { /* opsiyonel */ },
    "request_id": "req_xyz789"  // Debugging için
  }
}
```

**HTTP Status Codes:**
- `200` — Başarılı
- `201` — Oluşturuldu
- `400` — Geçersiz istek (validation)
- `401` — Auth gerekli
- `403` — Yetki yok
- `404` — Bulunamadı
- `429` — Rate limit aşıldı
- `500` — Sunucu hatası
- `503` — Bağımlılık servisi (Gemini API) düştü

---

## 8. Rate Limiting

| Endpoint | Limit |
|---|---|
| `/decisions/analyze` | 10 / dakika / kullanıcı |
| `/decisions/{decision_id}/answer` | 30 / dakika / kullanıcı |
| Diğer GET endpoint'leri | 100 / dakika / kullanıcı |
| Demo endpoint'leri | 60 / dakika / IP |

---

## 9. CORS (Cross-Origin Resource Sharing — Çapraz Kaynak Paylaşımı)

İzin verilen origin'ler:
- `https://sepetiq.vercel.app` (Companion Web)
- `chrome-extension://[extension-id]` (Browser Extension)
- `http://localhost:3000` (Development)
- `http://localhost:5173` (Vite dev server)

---

## 10. Pydantic Şemaları (Backend Implementation Hints)

Tüm request/response şemaları Pydantic V2 ile tanımlanmalı.

```python
from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

class ProductInfo(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    price: float = Field(..., gt=0)
    category: Literal["electronics", "cosmetics"]
    technical_specs: dict
    description: str
    source_url: str
    reviews: list[ReviewItem] = Field(default_factory=list)

class AnalyzeRequest(BaseModel):
    product: ProductInfo
    mode: Literal["soft", "balanced", "strict"] = "balanced"
    context: ContextInfo

class ScoreSet(BaseModel):
    product_fit: int = Field(..., ge=0, le=100)
    review_risk: int = Field(..., ge=0, le=100)
    need_score: int = Field(..., ge=0, le=100)

class DecisionResponse(BaseModel):
    decision_id: str
    verdict: Literal["buy", "conditional_buy", "wait", "dont_buy", "consider_alternative"]
    scores: ScoreSet
    headline: str
    body: str
    primary_reason: str
    suggested_action: str | None = None
    created_at: datetime
```

---

## 11. WebSocket Alternative (V2 Planı)

V1'de Server-Sent Events kullanılıyor. V2'de WebSocket'a geçilebilir (bidirectional iletişim, daha hızlı). Hackathon MVP'sinde SSE yeterli.
