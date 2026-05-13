# DATABASE.md — Veritabanı Şeması

> Supabase (PostgreSQL) için tablo tasarımı, ilişkiler ve Row Level Security (RLS — Satır Düzeyinde Güvenlik) politikaları.

---

## 1. Genel Yaklaşım

**Supabase Auth + Database** kombinasyonu kullanılır:
- Kullanıcı tablosu Supabase'in built-in (yerleşik) `auth.users` tablosudur
- Bizim kendi tablolarımız `public.` şeması altındadır
- Her kullanıcı sadece **kendi verilerine** erişebilir (RLS ile sağlanır)

---

## 2. Tablolar Genel Görünüm

```
auth.users (Supabase managed)
    │
    ├──> public.user_profiles (1:1)
    │       │
    │       ├──> public.user_preferences (1:1)
    │       │
    │       ├──> public.past_purchases (1:N)
    │       │
    │       └──> public.decisions (1:N)
    │               │
    │               ├──> public.decision_scores (1:1)
    │               │
    │               ├──> public.decision_questions (1:N)
    │               │
    │               └──> public.agent_traces (1:N)
    │
    └──> public.demo_products (read-only, public)
            │
            └──> public.demo_reviews (1:N)
```

---

## 3. Tablo Detayları

### 3.1 `public.user_profiles`

```sql
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Tetikleyici:** Google ile giriş yapan kullanıcı için otomatik profile oluştur.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### 3.2 `public.user_preferences`

```sql
CREATE TABLE public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    default_mode TEXT DEFAULT 'balanced' CHECK (default_mode IN ('soft', 'balanced', 'strict')),
    monthly_budget NUMERIC(10, 2),
    savings_goal NUMERIC(10, 2),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    timezone TEXT DEFAULT 'Europe/Istanbul',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.3 `public.past_purchases`

Kullanıcının geçmiş alışverişleri. **KILLER FEATURE** burada yaşıyor.

```sql
CREATE TABLE public.past_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    price NUMERIC(10, 2) NOT NULL,
    purchase_date DATE NOT NULL,
    usage_frequency TEXT CHECK (usage_frequency IN ('never', 'rarely', 'sometimes', 'often', 'daily')),
    satisfaction TEXT CHECK (satisfaction IN ('regretted', 'neutral', 'satisfied')),
    notes TEXT,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'decision', 'imported')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_past_purchases_user ON public.past_purchases(user_id);
CREATE INDEX idx_past_purchases_category ON public.past_purchases(user_id, category);
```

---

### 3.4 `public.decisions`

Ana karar tablosu.

```sql
CREATE TABLE public.decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Product info (denormalized — performans için)
    product_name TEXT NOT NULL,
    product_category TEXT NOT NULL,
    product_price NUMERIC(10, 2) NOT NULL,
    product_url TEXT,
    product_thumbnail TEXT,
    
    -- Decision details
    mode_used TEXT NOT NULL CHECK (mode_used IN ('soft', 'balanced', 'strict')),
    verdict TEXT NOT NULL CHECK (verdict IN ('buy', 'conditional_buy', 'wait', 'dont_buy', 'consider_alternative')),
    confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
    
    -- Tone output
    headline TEXT NOT NULL,
    body TEXT NOT NULL,
    suggested_action TEXT,
    
    -- User feedback (sonradan doldurulur)
    user_action TEXT CHECK (user_action IN ('followed', 'ignored', 'purchased_anyway')),
    user_action_at TIMESTAMPTZ,
    estimated_savings NUMERIC(10, 2),  -- followed && verdict != 'buy' ise
    
    -- Cycle info
    total_cycles INTEGER DEFAULT 1,
    total_duration_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_decisions_user ON public.decisions(user_id, created_at DESC);
CREATE INDEX idx_decisions_verdict ON public.decisions(user_id, verdict);
```

---

### 3.5 `public.decision_scores`

```sql
CREATE TABLE public.decision_scores (
    decision_id UUID PRIMARY KEY REFERENCES public.decisions(id) ON DELETE CASCADE,
    product_fit INTEGER NOT NULL CHECK (product_fit BETWEEN 0 AND 100),
    review_risk INTEGER NOT NULL CHECK (review_risk BETWEEN 0 AND 100),
    need_score INTEGER NOT NULL CHECK (need_score BETWEEN 0 AND 100),
    
    -- Detaylar (JSON olarak)
    fit_reasoning JSONB,  -- list of strings
    risk_factors JSONB,   -- list of {type, severity, description}
    need_reasoning JSONB  -- list of strings
);
```

---

### 3.6 `public.decision_questions`

Need Analyzer'ın sorduğu sorular ve cevapları.

```sql
CREATE TABLE public.decision_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
    cycle_iteration INTEGER NOT NULL DEFAULT 1,
    
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'yes_no', 'scale', 'free_text')),
    options JSONB,  -- multiple_choice için
    triggered_by TEXT,  -- "initial" | "risk_factor:battery" | "behavior:impulsive"
    
    user_answer JSONB,  -- {value: "...", answered_at: "..."}
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_decision ON public.decision_questions(decision_id);
```

---

### 3.7 `public.agent_traces`

Her ajanın trace bilgisi.

```sql
CREATE TABLE public.agent_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
    
    agent_name TEXT NOT NULL,
    cycle_iteration INTEGER NOT NULL DEFAULT 1,
    sequence_order INTEGER NOT NULL,
    
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
    
    input_summary TEXT,
    output_summary TEXT,
    key_findings JSONB,  -- list of strings
    triggered_actions JSONB,  -- list of triggers
    
    error_message TEXT  -- failed ise
);

CREATE INDEX idx_traces_decision ON public.agent_traces(decision_id, sequence_order);
```

---

### 3.8 `public.demo_products`

Hackathon demo'su için sabit ürün katalogu. **Auth gerekmez, herkes okuyabilir.**

```sql
CREATE TABLE public.demo_products (
    id TEXT PRIMARY KEY,  -- "demo_laptop_1", "demo_watch_1" gibi
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('electronics', 'cosmetics')),
    subcategory TEXT,
    price NUMERIC(10, 2) NOT NULL,
    thumbnail_url TEXT,
    image_urls JSONB,
    description TEXT,
    technical_specs JSONB,
    brand TEXT,
    
    -- Demo control
    is_active BOOLEAN DEFAULT TRUE,
    demo_scenario TEXT,  -- "buy", "wait", "dont_buy" - hangi demo senaryosu için
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.9 `public.demo_reviews`

```sql
CREATE TABLE public.demo_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.demo_products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL,
    review_date DATE NOT NULL,
    reviewer_name TEXT,
    verified_buyer BOOLEAN DEFAULT TRUE,
    helpful_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON public.demo_reviews(product_id);
```

---

### 3.10 `public.demo_user_profiles`

Hackathon demo'su için 3 hazır kullanıcı profili. **Demo akışında kullanılır.**

```sql
CREATE TABLE public.demo_user_profiles (
    id TEXT PRIMARY KEY,  -- "mehmet_student", "ayse_professional", "can_budget_aware"
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    age INTEGER,
    occupation TEXT,
    persona_description TEXT,
    
    default_mode TEXT NOT NULL,
    monthly_budget NUMERIC(10, 2),
    
    -- Geçmiş alışverişleri (denormalized)
    past_purchases JSONB,  -- list of PastPurchase
    
    -- Stats
    behavioral_traits JSONB  -- ["impulsive", "discount_driven", vb.]
);
```

**Önemli:** Bu tablo gerçek kullanıcılar için kullanılmaz. Sadece **demo mode**'da, jüri'ye gösterilen senaryolarda.

---

## 4. Row Level Security (RLS — Satır Düzeyinde Güvenlik) Politikaları

Supabase her tabloda RLS aktifleştirilmesini bekler. Aşağıdaki politikalar her kullanıcının **sadece kendi verisine** erişmesini sağlar.

### 4.1 user_profiles

```sql
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);
```

### 4.2 user_preferences

```sql
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);
```

### 4.3 past_purchases

```sql
ALTER TABLE public.past_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own purchases"
    ON public.past_purchases FOR ALL
    USING (auth.uid() = user_id);
```

### 4.4 decisions

```sql
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decisions"
    ON public.decisions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Backend can insert decisions"
    ON public.decisions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decisions"
    ON public.decisions FOR UPDATE
    USING (auth.uid() = user_id);
```

### 4.5 decision_scores, decision_questions, agent_traces

Bunlar decisions'a bağlı olduğu için decisions üzerinden kontrol:

```sql
ALTER TABLE public.decision_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decision scores"
    ON public.decision_scores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.decisions
            WHERE decisions.id = decision_scores.decision_id
            AND decisions.user_id = auth.uid()
        )
    );

-- Aynı pattern decision_questions ve agent_traces için
```

### 4.6 demo_products, demo_reviews, demo_user_profiles

**Herkese açık:**

```sql
ALTER TABLE public.demo_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo products are public"
    ON public.demo_products FOR SELECT
    USING (true);  -- Herkese SELECT izni
```

---

## 5. Yardımcı Fonksiyonlar

### 5.1 set_updated_at

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Geçmiş alışveriş benzerliği (KILLER FEATURE için)

Bu fonksiyon, mevcut bir ürünle benzer geçmiş alışverişleri bulur. Backend Behavior Profile Agent'tan çağrılır.

```sql
CREATE OR REPLACE FUNCTION public.find_similar_past_purchases(
    p_user_id UUID,
    p_category TEXT,
    p_subcategory TEXT,
    p_price NUMERIC,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    purchase_id UUID,
    product_name TEXT,
    category TEXT,
    price NUMERIC,
    purchase_date DATE,
    usage_frequency TEXT,
    satisfaction TEXT,
    relevance_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pp.id,
        pp.product_name,
        pp.category,
        pp.price,
        pp.purchase_date,
        pp.usage_frequency,
        pp.satisfaction,
        -- Relevance scoring (basit kural)
        CASE
            WHEN pp.subcategory = p_subcategory THEN 100
            WHEN pp.category = p_category THEN 70
            ELSE 30
        END
        - LEAST(40, ABS(pp.price - p_price) / GREATEST(p_price, 1) * 50)::INTEGER
        AS relevance_score
    FROM public.past_purchases pp
    WHERE pp.user_id = p_user_id
        AND pp.category = p_category
    ORDER BY relevance_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. Seed Data (İlk Veri Yüklemesi)

Hackathon için demo data SQL dosyasında olmalı:

```
backend/migrations/
├── 001_create_tables.sql
├── 002_create_rls_policies.sql
├── 003_create_functions.sql
└── 004_seed_demo_data.sql
```

Demo data örnekleri için [MOCKDATA.md](./MOCKDATA.md)'a bakın.

---

## 7. Production Notları

- **Backup:** Supabase otomatik günlük backup verir. Hackathon süresince yeterli.
- **Migration tool:** `supabase db push` veya manuel SQL ile uygulanır.
- **Connection pooling:** Supabase'in built-in pooler'ı (PgBouncer) yeterli.
- **Monitoring:** Supabase dashboard'da query performance metrics.

---

## 8. ER Diagram (Özet)

```
auth.users (1) ──────── (1) user_profiles
                              │
                              ├── (1:1) user_preferences
                              │
                              ├── (1:N) past_purchases
                              │
                              └── (1:N) decisions
                                          │
                                          ├── (1:1) decision_scores
                                          │
                                          ├── (1:N) decision_questions
                                          │
                                          └── (1:N) agent_traces

demo_products (1) ──────── (1:N) demo_reviews

demo_user_profiles (standalone)
```
