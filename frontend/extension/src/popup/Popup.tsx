import { useEffect, useState } from "react";

const DASHBOARD_URL = "http://localhost:3000";

const SUPPORTED_URL_PATTERNS = [
  /trendyol\.com/,
  /hepsiburada\.com/,
  /n11\.com/,
  /amazon\.com/,
  /localhost:\d+/,
];

interface AuthState {
  userId: string | null;
  token: string | null;
}

function isSupportedSite(url: string): boolean {
  return SUPPORTED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

export function Popup() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [activeTabUrl, setActiveTabUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      chrome.storage.local.get(["supabase_user_id", "supabase_token"]),
      chrome.tabs.query({ active: true, currentWindow: true }),
    ]).then(([storage, tabs]) => {
      setAuth({
        userId: (storage["supabase_user_id"] as string | null) ?? null,
        token: (storage["supabase_token"] as string | null) ?? null,
      });
      setActiveTabUrl(tabs[0]?.url ?? "");
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ ...s.container, alignItems: "center", justifyContent: "center", minHeight: 120 }}>
        <div style={s.spinner} />
      </div>
    );
  }

  const isLoggedIn = !!(auth?.userId || auth?.token);
  const onSupportedSite = isSupportedSite(activeTabUrl);

  return (
    <div style={s.container}>
      <header style={s.header}>
        <span style={s.logo}>SepetIQ</span>
        <span style={s.tagline}>Bilinçli alışveriş asistanı</span>
      </header>

      {onSupportedSite && (
        <div style={s.siteBadge}>
          <span style={s.badgeDot} />
          Bu site destekleniyor
        </div>
      )}

      <div style={s.body}>
        {isLoggedIn ? (
          <LoggedInView onSupportedSite={onSupportedSite} />
        ) : (
          <LoggedOutView />
        )}
      </div>
    </div>
  );
}

function LoggedOutView() {
  return (
    <div style={s.section}>
      <p style={s.description}>
        Satın alma kararlarınızı analiz etmek için giriş yapın.
      </p>
      <a href={`${DASHBOARD_URL}/login`} target="_blank" rel="noreferrer" style={s.primaryButton}>
        Google ile Giriş Yap
      </a>
    </div>
  );
}

function LoggedInView({ onSupportedSite }: { onSupportedSite: boolean }) {
  return (
    <div style={s.section}>
      <p style={s.description}>
        {onSupportedSite
          ? 'Ürün sayfasında "SepetIQ ile Kontrol Et" butonuna tıklayın.'
          : "Desteklenen bir alışveriş sitesine gidin ve ürünü analiz edin."}
      </p>
      <a
        href={`${DASHBOARD_URL}/dashboard`}
        target="_blank"
        rel="noreferrer"
        style={s.primaryButton}
      >
        Dashboard'u Aç
      </a>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    width: 320,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "16px 16px 12px",
    borderBottom: "1px solid #f3f4f6",
  },
  logo: {
    fontSize: 16,
    fontWeight: 900,
    color: "#6366f1",
    letterSpacing: "-0.3px",
  },
  tagline: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: 600,
  },
  siteBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "#f0fdf4",
    borderBottom: "1px solid #dcfce7",
    fontSize: 12,
    fontWeight: 700,
    color: "#16a34a",
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#22c55e",
    flexShrink: 0,
    display: "inline-block",
  },
  body: {
    padding: "12px 16px 16px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  description: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  primaryButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "0 16px",
    borderRadius: 8,
    background: "#6366f1",
    color: "white",
    fontSize: 13,
    fontWeight: 800,
    textDecoration: "none",
    cursor: "pointer",
  },
  spinner: {
    width: 22,
    height: 22,
    border: "3px solid #e0e7ff",
    borderTopColor: "#6366f1",
    borderRadius: "50%",
    animation: "spin 700ms linear infinite",
  },
};
