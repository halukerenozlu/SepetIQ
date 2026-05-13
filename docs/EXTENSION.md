# EXTENSION.md — Browser Eklentisi Mimarisi

> Chrome Manifest V3 eklentisi. React + TypeScript + Vite + @crxjs/vite-plugin stack'i ile.

---

## 1. Genel Mimari

Chrome eklentileri 3 ana parçadan oluşur:

```
┌─────────────────────────────────────────────────────┐
│                  E-Ticaret Sayfası                  │
│  (trendyol.com, hepsiburada.com, demo-site.com)     │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Content Script                               │  │
│  │  - Sayfayı okur (DOM scraping)                │  │
│  │  - Ürün bilgisi çıkarır                       │  │
│  │  - Floating button gösterir                   │  │
│  │  - Karar paneli render eder                   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                          │
                          ▼ (messaging)
┌─────────────────────────────────────────────────────┐
│  Background Service Worker                          │
│  - API çağrıları (SepetIQ backend)                  │
│  - Auth token yönetimi                              │
│  - Cross-tab state management                       │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  Popup (eklenti ikonuna tıklanınca açılır)          │
│  - Quick settings                                   │
│  - Login durumu                                     │
│  - "Companion Web'e git" linki                      │
└─────────────────────────────────────────────────────┘
```

---

## 2. Proje Yapısı

```
extension/
├── manifest.json
├── vite.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
│
├── src/
│   ├── content/                # Content scripts
│   │   ├── index.tsx           # Entry point
│   │   ├── DecisionPanel.tsx   # Ana karar paneli (modal)
│   │   ├── FloatingButton.tsx  # "SepetIQ ile Kontrol Et" butonu
│   │   ├── AgentTrace.tsx      # Yan panel agent trace
│   │   ├── ScoreCard.tsx       # 3 skor görselleştirme
│   │   ├── ModeSelector.tsx    # Mod seçici
│   │   ├── QuestionFlow.tsx    # Soru-cevap akışı
│   │   └── scrapers/           # Site-specific scrapers
│   │       ├── trendyol.ts
│   │       ├── hepsiburada.ts
│   │       └── demo.ts         # Demo site için
│   │
│   ├── popup/                  # Popup UI
│   │   ├── index.tsx
│   │   ├── Popup.tsx
│   │   └── LoginButton.tsx
│   │
│   ├── background/             # Service worker
│   │   ├── index.ts
│   │   ├── api.ts              # Backend API client
│   │   ├── auth.ts             # Auth management
│   │   └── messaging.ts        # Content-script messaging
│   │
│   ├── shared/                 # Paylaşılan kod
│   │   ├── types.ts            # TypeScript types
│   │   ├── constants.ts
│   │   └── utils.ts
│   │
│   └── styles/
│       └── global.css          # Tailwind + custom styles
│
├── public/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
```

---

## 3. manifest.json

Manifest V3 spec'i:

```json
{
  "manifest_version": 3,
  "name": "SepetIQ — Bilinçli Alışveriş Asistanı",
  "version": "0.1.0",
  "description": "Almak istediğin ürünü gerçekten alıp almaman gerektiğini sorgulayan AI eklentisi.",
  
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  
  "host_permissions": [
    "https://www.trendyol.com/*",
    "https://www.hepsiburada.com/*",
    "https://sepetiq-demo.vercel.app/*"
  ],
  
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": [
        "https://www.trendyol.com/*-p-*",
        "https://www.hepsiburada.com/*-p-*",
        "https://sepetiq-demo.vercel.app/product/*"
      ],
      "js": ["src/content/index.tsx"],
      "css": ["src/styles/global.css"],
      "run_at": "document_idle"
    }
  ],
  
  "web_accessible_resources": [
    {
      "resources": ["icons/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## 4. Content Script Workflow

### 4.1 Sayfa Algılama

```typescript
// src/content/index.tsx

import { detectSite, getScraperFor } from './scrapers';
import { mountFloatingButton } from './FloatingButton';

(async () => {
    const site = detectSite(window.location.hostname);
    if (!site) return;
    
    const scraper = getScraperFor(site);
    
    // Sayfa ürün sayfası mı?
    if (!scraper.isProductPage()) return;
    
    // Sayfadan ürün bilgisini çek
    const productInfo = await scraper.extractProductInfo();
    
    // Floating button mount et
    mountFloatingButton({ productInfo, site });
})();
```

### 4.2 Site-Specific Scrapers

Her site için ayrı bir scraper. DOM selector'ları (CSS seçiciler) burada.

```typescript
// src/content/scrapers/trendyol.ts

export const trendyolScraper = {
    name: 'trendyol',
    
    isProductPage(): boolean {
        return !!document.querySelector('[data-pk]');  // Trendyol ürün PK attribute'u
    },
    
    async extractProductInfo(): Promise<ProductInfo> {
        const name = document.querySelector('h1.pr-new-br')?.textContent?.trim() ?? '';
        const priceText = document.querySelector('.prc-dsc')?.textContent ?? '0';
        const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
        
        const specs = this.extractSpecs();
        const reviews = await this.extractReviews();
        
        return {
            name,
            price,
            category: 'electronics',  // TODO: kategori detection
            technical_specs: specs,
            description: '',
            source_url: window.location.href,
            reviews
        };
    },
    
    extractSpecs(): Record<string, string> {
        const specs: Record<string, string> = {};
        document.querySelectorAll('.detail-attr-item').forEach(item => {
            const key = item.querySelector('.attribute-name')?.textContent?.trim();
            const value = item.querySelector('.attribute-value')?.textContent?.trim();
            if (key && value) specs[key] = value;
        });
        return specs;
    },
    
    async extractReviews(): Promise<Review[]> {
        // Yorumlar genelde lazy-loaded — scroll trigger gerekebilir
        // Hackathon için ilk 10-15 yorum yeterli
        const reviewElements = document.querySelectorAll('.comment-card');
        return Array.from(reviewElements).slice(0, 15).map(el => ({
            rating: parseInt(el.querySelector('.star-rating')?.getAttribute('data-rating') ?? '0'),
            text: el.querySelector('.comment-text')?.textContent?.trim() ?? '',
            date: el.querySelector('.comment-date')?.textContent?.trim() ?? '',
            verified_buyer: !!el.querySelector('.verified-badge')
        }));
    }
};
```

### 4.3 Floating Button

```typescript
// src/content/FloatingButton.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import { DecisionPanel } from './DecisionPanel';

export function mountFloatingButton({ productInfo, site }) {
    const container = document.createElement('div');
    container.id = 'sepetiq-root';
    document.body.appendChild(container);
    
    const root = createRoot(container);
    root.render(<FloatingButton productInfo={productInfo} site={site} />);
}

function FloatingButton({ productInfo, site }) {
    const [panelOpen, setPanelOpen] = useState(false);
    
    return (
        <>
            <button
                className="sepetiq-floating-button"
                onClick={() => setPanelOpen(true)}
            >
                <SepetIQLogo />
                <span>Bu ürüne gerçekten ihtiyacım var mı?</span>
            </button>
            
            {panelOpen && (
                <DecisionPanel
                    productInfo={productInfo}
                    onClose={() => setPanelOpen(false)}
                />
            )}
        </>
    );
}
```

### 4.4 Decision Panel (Ana UI)

```typescript
// src/content/DecisionPanel.tsx

import { useState, useEffect } from 'react';
import { ModeSelector } from './ModeSelector';
import { ScoreCard } from './ScoreCard';
import { AgentTrace } from './AgentTrace';
import { QuestionFlow } from './QuestionFlow';
import { startDecisionAnalysis } from '../shared/api';

export function DecisionPanel({ productInfo, onClose }) {
    const [mode, setMode] = useState<Mode>('balanced');
    const [phase, setPhase] = useState<Phase>('mode_selection');
    // 'mode_selection' | 'analyzing' | 'questions' | 'completed'
    
    const [scores, setScores] = useState<ScoreSet | null>(null);
    const [trace, setTrace] = useState<AgentTraceEntry[]>([]);
    const [questions, setQuestions] = useState<NeedQuestion[]>([]);
    const [decision, setDecision] = useState<DecisionOutput | null>(null);
    
    const handleStart = async () => {
        setPhase('analyzing');
        
        // SSE stream başlat
        const stream = await startDecisionAnalysis({
            product: productInfo,
            mode,
            context: getCurrentContext()
        });
        
        for await (const event of stream) {
            switch (event.type) {
                case 'agent_started':
                case 'agent_completed':
                    setTrace(prev => [...prev, event.data]);
                    break;
                
                case 'questions_required':
                    setQuestions(event.data.questions);
                    setPhase('questions');
                    break;
                
                case 'decision_ready':
                    setDecision(event.data);
                    setScores(event.data.scores);
                    setPhase('completed');
                    break;
            }
        }
    };
    
    return (
        <div className="sepetiq-panel-overlay">
            <div className="sepetiq-panel">
                <CloseButton onClick={onClose} />
                
                {phase === 'mode_selection' && (
                    <>
                        <ModeSelector value={mode} onChange={setMode} />
                        <button onClick={handleStart}>Analizi Başlat</button>
                    </>
                )}
                
                {phase === 'analyzing' && (
                    <LoadingState message="SepetIQ düşünüyor..." />
                )}
                
                {phase === 'questions' && (
                    <QuestionFlow
                        questions={questions}
                        onComplete={handleAnswers}
                    />
                )}
                
                {phase === 'completed' && decision && (
                    <DecisionDisplay decision={decision} scores={scores} />
                )}
                
                {/* Agent trace yan panel */}
                <AgentTrace entries={trace} />
            </div>
        </div>
    );
}
```

---

## 5. Background Service Worker

```typescript
// src/background/index.ts

import { setupAuthListener } from './auth';
import { setupApiClient } from './api';

setupAuthListener();
setupApiClient();

// Cross-tab state senkronizasyonu
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'GET_AUTH_TOKEN':
            getAuthToken().then(sendResponse);
            return true;  // async response
        
        case 'API_CALL':
            handleApiCall(message.payload).then(sendResponse);
            return true;
    }
});
```

### 5.1 Auth Management

```typescript
// src/background/auth.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

export async function loginWithGoogle() {
    // Google OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: chrome.identity.getRedirectURL()
        }
    });
}
```

**Önemli:** Eklenti auth flow'u biraz farklı. `chrome.identity` API'si veya Companion Web'den oturum import etme kullanılabilir. En kolay yol: kullanıcı Companion Web'de giriş yapar, eklenti onun session'ını okur.

---

## 6. Popup UI

```typescript
// src/popup/Popup.tsx

import { useUserStatus } from './hooks';

export function Popup() {
    const { user, isLoading } = useUserStatus();
    
    if (isLoading) return <Loading />;
    
    if (!user) {
        return (
            <div className="popup">
                <SepetIQLogo />
                <p>SepetIQ'yu kullanmak için giriş yapmalısın</p>
                <a href="https://sepetiq.vercel.app/login" target="_blank">
                    Companion Web'de Giriş Yap
                </a>
            </div>
        );
    }
    
    return (
        <div className="popup">
            <UserAvatar user={user} />
            <p>Merhaba {user.name}</p>
            
            <QuickModeSelector />
            
            <div className="popup-actions">
                <a href="https://sepetiq.vercel.app/dashboard">
                    Geçmiş Kararlarım
                </a>
                <a href="https://sepetiq.vercel.app/stats">
                    Tasarruf İstatistikleri
                </a>
            </div>
        </div>
    );
}
```

---

## 7. Vite Configuration

```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
    plugins: [
        react(),
        crx({ manifest })
    ],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                popup: 'src/popup/index.html'
            }
        }
    }
});
```

---

## 8. Demo Senaryosu için Sahte E-Ticaret Sayfası

Hackathon demo sırasında risk almamak için **sahte bir Trendyol/Hepsiburada görünümünde** sayfa yapılır.

```
sepetiq-demo.vercel.app/product/[id]
```

Bu sayfa:
- Görünüm olarak Trendyol'a benzer
- Mock ürünleri demo_products tablosundan çeker
- Eklenti bu sayfada da çalışacak şekilde manifest'e eklendi
- Demo senaryosu kontrolünde — her zaman çalışır

Detaylar [WEB.md](./WEB.md)'de.

---

## 9. Performance ve UX Hususları

### 9.1 Floating Button Davranışı
- Sayfa yüklendikten 2 saniye sonra belirir (saldırgan değil)
- Eğer kullanıcı sayfanın altına scroll yaparsa daha belirgin hale gelir
- Disiplinli mod'da otomatik açılabilir (kullanıcı ayarına göre)

### 9.2 Panel Animasyonları
- Açılış: slide-in from right, 300ms
- Kapanış: fade-out, 200ms
- Skor sayıları: 0'dan hedef değere animasyonla yükselir

### 9.3 Bekleyen LLM İşlemi
- "SepetIQ düşünüyor..." mesajı
- Agent trace canlı akış (her ajan tamamlandığında bir satır eklenir)
- Toplam beklenen süre: 8-12 saniye

### 9.4 Error Recovery
- LLM hatası → "Bağlantı sorunu, tekrar dene" butonu
- Demo mod fallback: hardcoded senaryo cevapları

---

## 10. Build ve Deploy

```bash
# Geliştirme
pnpm dev    # Vite dev server, hot reload

# Build
pnpm build  # dist/ klasörü oluşur

# Chrome'a yükleme (geliştirme)
# chrome://extensions/
# → Developer mode aç
# → Load unpacked → dist/ klasörünü seç

# Chrome Web Store (production)
# - dist/ klasörünü zip'le
# - Chrome Developer Console'a yükle
# - Onay süreci (hackathon için gerekli değil)
```

---

## 11. Hackathon Demo Riski ve Azaltma

**Risk:** Demo sırasında gerçek Trendyol HTML'i değişmiş olur, scraper çalışmaz.

**Azaltma stratejisi:**
1. **Birincil:** Sahte demo sitesi (sepetiq-demo.vercel.app) — kontrolünde
2. **İkincil:** Gerçek Trendyol sayfasını da göstermeyi dene
3. **Yedek:** Önceden kaydedilmiş 5 dakikalık video demo

Sunumda akış: önce sahte sitede tam demo, sonra "bu eklenti gerçek Trendyol'da da çalışıyor" diye 30 saniyelik canlı kanıt veya video.
